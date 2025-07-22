-- Admin tables for CharterAI
-- Run these commands in Supabase SQL editor or via migrations before deploying the updated dashboard

-- ================================
-- TOKEN USAGE TABLE
-- ================================
create extension if not exists "uuid-ossp";

create table if not exists public.token_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id),
  plan_id text,
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  created_at timestamp with time zone default now()
);

alter table public.token_usage enable row level security;

-- Only admins may SELECT all rows.  Each authenticated user may insert their own rows.
create policy "Admins can read token usage" on public.token_usage
  for select using (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'admin'
    or (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "Owner can insert own usage" on public.token_usage
  for insert with check (auth.uid() = user_id);

-- ================================
-- ERROR LOGS TABLE
-- ================================
create table if not exists public.error_logs (
  id uuid primary key default uuid_generate_v4(),
  function_name text,
  error_message text,
  stack_trace text,
  user_id uuid,
  created_at timestamp with time zone default now()
);

alter table public.error_logs enable row level security;

create policy "Admins can read error logs" on public.error_logs
  for select using (
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'admin'
    or (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "Edge functions can insert" on public.error_logs
  for insert with check (true);

-- ================================
-- ADMIN USER VIEW (read-only list)
-- ================================
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