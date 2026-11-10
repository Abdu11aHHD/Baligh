-- Behavioural tests for the Balligh schema. Run after the stub, migration, and seed.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'random@example.com');
\i supabase/bootstrap-admin.sql

-- 1. Service role creates a ticket atomically (report + 'created' event)
set local role service_role;
select ticket_number as t1 from public.create_report(jsonb_build_object(
  'location_id', (select id from public.locations where code = 'WC-F2'),
  'raw_description', 'ما فيه مناديل من الصباح',
  'clarifications', '[]'::jsonb,
  'title', 'نقص المناديل', 'summary', 'لا توجد مناديل.',
  'category', 'facilities', 'subcategory', 'supplies', 'priority', 'normal',
  'assigned_department', 'facilities',
  'ai_title', 'نقص المناديل', 'ai_category', 'facilities', 'ai_priority', 'normal',
  'ai_department', 'facilities', 'ai_priority_reason', 'r', 'ai_model', 'meta-llama/llama-3.1-8b-instruct',
  'safety_flags', '[]'::jsonb, 'safety_min_priority', '',
  'tracking_hash', repeat('a', 64)
)) \gset
do $$ begin
  assert (select count(*) from public.report_events e join public.reports r on r.id = e.report_id where r.ticket_number = 'BLG-000001' and e.event_type = 'created') = 1, 'created event missing';
  assert (select ticket_number from public.reports limit 1) = 'BLG-000001', 'ticket number format';
end $$;
\echo ✓ create_report works: :t1

-- 2. Invalid category rejected by constraint
do $$ begin
  begin
    perform public.create_report(jsonb_build_object('location_id', null, 'location_text', 'x', 'raw_description','x','title','x','summary','x',
      'category','hacking','subcategory','other','priority','normal','assigned_department','general',
      'ai_title','x','ai_category','x','ai_priority','normal','ai_department','x','ai_model','m','tracking_hash', repeat('b',64)));
    raise exception 'should have failed';
  exception when check_violation then null;
  end;
  begin
    perform public.create_report(jsonb_build_object('raw_description','x','title','x','summary','x',
      'category','other','subcategory','other','priority','normal','assigned_department','general',
      'ai_title','x','ai_category','x','ai_priority','normal','ai_department','x','ai_model','m','tracking_hash', repeat('b',64)));
    raise exception 'should have failed (no location)';
  exception when check_violation then null;
  end;
end $$;
\echo ✓ constraints reject bad category and missing location

-- 3. Rate limiter
do $$ declare ok boolean; i int; begin
  for i in 1..3 loop ok := public.check_rate_limit('t:ip', 3, 600); assert ok, 'within limit'; end loop;
  ok := public.check_rate_limit('t:ip', 3, 600); assert not ok, 'over limit must be refused';
end $$;
\echo ✓ rate limiter allows N then refuses
reset role;

-- 4. Anonymous users: can read active locations, nothing else
set local role anon;
do $$ begin
  assert (select count(*) from public.locations) = 7, 'anon should see 7 active seed locations';
  assert (select count(*) from public.reports) = 0, 'anon must not see reports';
  assert (select count(*) from public.report_events) = 0, 'anon must not see events';
  assert (select count(*) from public.rate_limits) = 0, 'anon must not see rate limits';
end $$;
do $$ begin
  begin perform public.create_report('{}'::jsonb); raise exception 'anon create_report should be denied';
  exception when insufficient_privilege then null; end;
  begin perform public.check_rate_limit('x', 1, 1); raise exception 'anon rate limit fn should be denied';
  exception when insufficient_privilege then null; end;
  begin insert into public.reports (raw_description) values ('x'); raise exception 'anon insert should fail';
  exception when insufficient_privilege or check_violation or not_null_violation then null; end;
end $$;
\echo ✓ anon: reads active locations only, cannot read/create reports directly
reset role;

-- 5. Signed-in non-admin
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';
do $$ begin
  assert (select count(*) from public.reports) = 0, 'non-admin must not see reports';
  assert (select count(*) from public.admin_users) = 0, 'non-admin sees no admin rows';
  begin
    perform public.admin_update_report((select '00000000-0000-0000-0000-000000000000'::uuid), 'resolved');
    raise exception 'non-admin update should be denied';
  exception when insufficient_privilege then null; end;
  assert (public.admin_report_stats()->>'total')::int = 0, 'non-admin stats must be empty';
end $$;
\echo ✓ non-admin user: no reports, no updates, empty stats
reset role;

-- 6. Admin
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
do $$ declare rid uuid; r public.reports; begin
  assert (select count(*) from public.admin_users) = 1, 'admin sees own row';
  assert (select count(*) from public.reports) = 1, 'admin sees reports';
  select id into rid from public.reports limit 1;
  r := public.admin_update_report(rid, 'in_progress', 'high', 'maintenance', 'تم التواصل مع الفني');
  assert r.status = 'in_progress' and r.priority = 'high' and r.assigned_department = 'maintenance', 'update applied';
  assert (select count(*) from public.report_events where report_id = rid) = 5, 'created + status + priority + dept + note';
  assert (select count(*) from public.report_events where report_id = rid and not is_internal) = 2, 'only created + status are public';
  r := public.admin_update_report(rid, 'resolved');
  assert r.resolved_at is not null, 'resolved_at set';
  assert (public.admin_report_stats()->>'resolved')::int = 1, 'stats reflect resolution';
  -- direct update bypassing the audited RPC is not allowed
  update public.reports set status = 'closed' where id = rid;
  assert (select status from public.reports where id = rid) = 'resolved', 'direct update must not apply (no RLS update policy)';
  -- location management
  insert into public.locations (code, name_ar) values ('LAB-9', 'معمل 9');
  update public.locations set is_active = false where code = 'LAB-9';
  assert (select count(*) from public.locations) = 8, 'admin sees inactive locations too';
end $$;
\echo ✓ admin: reads all, audited updates, stats, location management
reset role;

set local role anon;
do $$ begin assert (select count(*) from public.locations where code = 'LAB-9') = 0, 'disabled location hidden from anon'; end $$;
\echo ✓ disabled locations are hidden from the public
reset role;

rollback;
\echo ALL DATABASE TESTS PASSED
