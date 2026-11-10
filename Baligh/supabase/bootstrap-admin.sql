-- Run ONCE in the Supabase SQL editor after creating the user in
-- Authentication → Users (email + password). Replace the email below.
insert into public.admin_users (user_id, role)
select id, 'admin' from auth.users where email = 'admin@example.com'
on conflict (user_id) do update set role = excluded.role;
