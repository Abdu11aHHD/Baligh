-- ═══════════════════════════════════════════════════════════════════════════
-- Balligh AI — initial schema
-- Tables: locations, reports, report_events, admin_users, rate_limits
-- All writes from anonymous users go through server routes using the service
-- role and SECURITY DEFINER functions; browsers never get table access to reports.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── admin_users ────────────────────────────────────────────────────────────
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

-- ─── locations ──────────────────────────────────────────────────────────────
create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'),
  name_ar    text not null check (char_length(name_ar) between 2 and 80),
  building   text check (building is null or char_length(building) <= 60),
  floor      text check (floor is null or char_length(floor) <= 30),
  area       text check (area is null or char_length(area) <= 60),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index locations_active_idx on public.locations (is_active);
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- ─── reports ────────────────────────────────────────────────────────────────
create sequence public.ticket_number_seq start 1;

create table public.reports (
  id                   uuid primary key default gen_random_uuid(),
  ticket_number        text not null unique
                         default ('BLG-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  location_id          uuid references public.locations(id) on delete restrict,
  location_text        text check (location_text is null or char_length(location_text) <= 120),
  raw_description      text not null check (char_length(raw_description) between 1 and 1000),
  clarifications       jsonb not null default '[]'::jsonb check (jsonb_typeof(clarifications) = 'array'),
  title                text not null check (char_length(title) between 1 and 120),
  summary              text not null check (char_length(summary) between 1 and 600),
  category             text not null check (category in ('maintenance','it_support','facilities','safety','other')),
  subcategory          text not null check (subcategory in (
                         'air_conditioning','electrical','plumbing','general_repairs',
                         'internet_wifi','computers','projectors','classroom_tech',
                         'restrooms','supplies','cleaning','furniture','shared_spaces',
                         'exposed_cables','dangerous_leak','physical_hazard','unsafe_condition','other')),
  priority             text not null check (priority in ('low','normal','high','urgent')),
  assigned_department  text not null check (assigned_department in ('maintenance','it','facilities','safety','general')),
  status               text not null default 'new' check (status in ('new','in_review','in_progress','resolved','closed')),
  -- What Llama originally suggested (kept separate from trainee/admin edits)
  ai_title             text not null,
  ai_category          text not null,
  ai_priority          text not null check (ai_priority in ('low','normal','high','urgent')),
  ai_department        text not null,
  ai_priority_reason   text,
  ai_model             text not null,
  -- What the deterministic safety rules decided
  safety_flags         text[] not null default '{}',
  safety_min_priority  text check (safety_min_priority is null or safety_min_priority in ('low','normal','high','urgent')),
  tracking_hash        text not null check (char_length(tracking_hash) = 64),
  resolved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint reports_location_present
    check (location_id is not null or (location_text is not null and char_length(location_text) >= 2))
);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_status_idx     on public.reports (status);
create index reports_priority_idx   on public.reports (priority);
create index reports_category_idx   on public.reports (category);
create index reports_location_idx   on public.reports (location_id);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- ─── report_events (audit trail) ────────────────────────────────────────────
create table public.report_events (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.reports(id) on delete cascade,
  event_type      text not null check (event_type in ('created','status_changed','priority_changed','department_changed','note')),
  previous_status text,
  new_status      text,
  previous_value  text,
  new_value       text,
  admin_note      text check (admin_note is null or char_length(admin_note) <= 1000),
  -- internal events are never returned to trainees
  is_internal     boolean not null default true,
  actor_id        uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index report_events_report_idx on public.report_events (report_id, created_at);

-- ─── rate_limits (durable, serverless-safe) ─────────────────────────────────
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return c <= p_limit;
end $$;

-- ─── Ticket creation (atomic: report + 'created' event) ────────────────────
create or replace function public.create_report(p jsonb)
returns table (id uuid, ticket_number text, created_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.reports%rowtype;
begin
  insert into public.reports (
    location_id, location_text, raw_description, clarifications, title, summary,
    category, subcategory, priority, assigned_department,
    ai_title, ai_category, ai_priority, ai_department, ai_priority_reason, ai_model,
    safety_flags, safety_min_priority, tracking_hash
  ) values (
    nullif(p->>'location_id', '')::uuid,
    nullif(p->>'location_text', ''),
    p->>'raw_description',
    coalesce(p->'clarifications', '[]'::jsonb),
    p->>'title',
    p->>'summary',
    p->>'category',
    p->>'subcategory',
    p->>'priority',
    p->>'assigned_department',
    p->>'ai_title',
    p->>'ai_category',
    p->>'ai_priority',
    p->>'ai_department',
    p->>'ai_priority_reason',
    p->>'ai_model',
    coalesce(array(select jsonb_array_elements_text(p->'safety_flags')), '{}'),
    nullif(p->>'safety_min_priority', ''),
    p->>'tracking_hash'
  ) returning * into r;

  insert into public.report_events (report_id, event_type, new_status, is_internal)
  values (r.id, 'created', 'new', false);

  return query select r.id, r.ticket_number, r.created_at;
end $$;

-- ─── Admin update (atomic: change + audit events, admin check inside) ──────
create or replace function public.admin_update_report(
  p_report_id uuid,
  p_status text default null,
  p_priority text default null,
  p_department text default null,
  p_note text default null
)
returns public.reports
language plpgsql security definer
set search_path = public
as $$
declare
  r public.reports%rowtype;
  actor uuid := auth.uid();
begin
  if not public.is_admin(actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into r from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  if p_status is not null and p_status <> r.status then
    insert into public.report_events (report_id, event_type, previous_status, new_status, is_internal, actor_id)
    values (r.id, 'status_changed', r.status, p_status, false, actor);
    update public.reports
       set status = p_status,
           resolved_at = case when p_status in ('resolved','closed') then coalesce(resolved_at, now()) else null end
     where id = r.id;
  end if;

  if p_priority is not null and p_priority <> r.priority then
    insert into public.report_events (report_id, event_type, previous_value, new_value, is_internal, actor_id)
    values (r.id, 'priority_changed', r.priority, p_priority, true, actor);
    update public.reports set priority = p_priority where id = r.id;
  end if;

  if p_department is not null and p_department <> r.assigned_department then
    insert into public.report_events (report_id, event_type, previous_value, new_value, is_internal, actor_id)
    values (r.id, 'department_changed', r.assigned_department, p_department, true, actor);
    update public.reports set assigned_department = p_department where id = r.id;
  end if;

  if p_note is not null and char_length(btrim(p_note)) > 0 then
    insert into public.report_events (report_id, event_type, admin_note, is_internal, actor_id)
    values (r.id, 'note', btrim(p_note), true, actor);
  end if;

  select * into r from public.reports where id = p_report_id;
  return r;
end $$;

-- ─── Dashboard stats (security invoker → RLS applies) ──────────────────────
create or replace function public.admin_report_stats()
returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',       count(*),
    'new',         count(*) filter (where status = 'new'),
    'in_progress', count(*) filter (where status in ('in_review','in_progress')),
    'resolved',    count(*) filter (where status in ('resolved','closed')),
    'urgent_open', count(*) filter (where priority = 'urgent' and status not in ('resolved','closed')),
    'by_category', coalesce((select jsonb_object_agg(category, c)
                              from (select category, count(*) c from public.reports group by category) x), '{}'::jsonb)
  )
  from public.reports;
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.admin_users   enable row level security;
alter table public.locations     enable row level security;
alter table public.reports       enable row level security;
alter table public.report_events enable row level security;
alter table public.rate_limits   enable row level security;

-- admin_users: a signed-in user can see their own row (used for the admin check); admins see all.
create policy admin_users_select on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- locations: anyone may read ACTIVE locations; admins manage everything.
create policy locations_public_read on public.locations
  for select to anon, authenticated using (is_active);
create policy locations_admin_all on public.locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reports / events: admins can read. No direct insert/update policies — writes
-- go through create_report (service role) and admin_update_report (audited).
create policy reports_admin_read on public.reports
  for select to authenticated using (public.is_admin());
create policy report_events_admin_read on public.report_events
  for select to authenticated using (public.is_admin());

-- rate_limits: no policies → no access except service role.

-- ─── Function privileges ────────────────────────────────────────────────────
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_report(jsonb) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_report(jsonb) to service_role;

revoke all on function public.admin_update_report(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_update_report(uuid, text, text, text, text) to authenticated;

revoke all on function public.admin_report_stats() from public, anon;
grant execute on function public.admin_report_stats() to authenticated;

-- Sequence is only used by create_report (security definer).
revoke all on sequence public.ticket_number_seq from anon, authenticated;
