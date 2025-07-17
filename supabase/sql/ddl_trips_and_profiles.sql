-- Schema for storing user trips and profiles
-- Run these commands in Supabase SQL editor or as part of a migration

-- ================================
-- EXTENSIONS (if not already present)
-- ================================
create extension if not exists "uuid-ossp";

-- ================================
-- TRIPS TABLE
-- ================================
create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),
  plan_id text not null unique,
  user_id uuid references auth.users not null,
  itinerary jsonb not null,
  generated_at timestamp without time zone default now(),
  visibility text default 'private' check (visibility in ('private','public')),
  inserted_at timestamp with time zone default now()
);

-- Enable RLS so each user sees only their trips unless public
alter table public.trips enable row level security;

-- Allow owner full access
create policy "Owner can manage own trips" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow anyone to SELECT public trips
create policy "Public trips selectable" on public.trips
  for select using (visibility = 'public');

-- ================================
-- PROFILES TABLE
-- ================================
create table if not exists public.profiles (
  id uuid primary key references auth.users not null,
  display_name text,
  avatar_url text,
  updated_at timestamp without time zone default now()
);

alter table public.profiles enable row level security;

create policy "Public profile read" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id); 