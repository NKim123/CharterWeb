-- Patch: Allow authenticated users to insert their own usage records
-- Run this after deploying to update RLS policies

alter table public.usage_tracking enable row level security;

drop policy if exists "Users can insert own usage" on public.usage_tracking;

create policy "Users can insert own usage" on public.usage_tracking
  for insert with check (auth.uid() = user_id); 