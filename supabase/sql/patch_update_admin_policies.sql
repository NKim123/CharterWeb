/* Patch existing policies to include user_metadata.role fallback */

-- Ensure the token_usage admin read policy accepts role in user_metadata
alter policy "Admins can read token usage" on public.token_usage
  using (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'admin'
    or (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Ensure the error_logs admin read policy accepts role in user_metadata
alter policy "Admins can read error logs" on public.error_logs
  using (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'admin'
    or (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Recreate the admin_user_list view with updated filter
create or replace view public.admin_user_list as
select  id,
        email,
        raw_user_meta_data ->> 'role' as role,
        created_at
from auth.users
where (
  (current_setting('request.jwt.claims', true)::json ->> 'role') = 'admin'
  or (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role') = 'admin'
); 