-- Add preferences column to store original user request
alter table public.trips add column if not exists preferences jsonb;

-- Backfill: set preferences = '{}' where null (optional)
update public.trips set preferences = '{}' where preferences is null; 