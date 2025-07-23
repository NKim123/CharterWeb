-- Payment System Schema for CharterAI
-- This includes subscription management, usage tracking, and billing tables

-- ================================
-- SUBSCRIPTIONS TABLE
-- ================================
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
  plan_type text not null default 'pro' check (plan_type in ('free', 'pro')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies for subscriptions
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Service role can manage subscriptions" on public.subscriptions
  for all using (auth.role() = 'service_role');

-- ================================
-- USAGE TRACKING TABLE (Enhanced)
-- ================================
create table if not exists public.usage_tracking (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  action_type text not null check (action_type in ('trip_generation', 'chat_message')),
  plan_id text,
  tokens_used integer default 0,
  cost_usd decimal(10,4) default 0,
  billing_period_start timestamp with time zone,
  billing_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.usage_tracking enable row level security;

-- Policies for usage tracking
create policy "Users can view own usage" on public.usage_tracking
  for select using (auth.uid() = user_id);

create policy "Users can insert own usage" on public.usage_tracking
  for insert with check (auth.uid() = user_id);

create policy "Service role can manage usage" on public.usage_tracking
  for all using (auth.role() = 'service_role');

-- ================================
-- BILLING HISTORY TABLE
-- ================================
create table if not exists public.billing_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  stripe_invoice_id text,
  amount_paid decimal(10,2),
  currency text default 'usd',
  status text not null check (status in ('paid', 'open', 'void', 'draft')),
  invoice_pdf_url text,
  billing_period_start timestamp with time zone,
  billing_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.billing_history enable row level security;

-- Function to get user current usage
create or replace function get_user_current_usage(user_uuid uuid)
returns table (
  trip_generations bigint,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone
)
language plpgsql
security definer
as $function$
declare
  sub_record record;
  period_start timestamp with time zone;
  period_end timestamp with time zone;
begin
  -- Get user's subscription to determine billing period
  select * into sub_record
  from public.subscriptions 
  where user_id = user_uuid 
  and status = 'active'
  limit 1;
  
  if sub_record.id is not null then
    -- Use subscription billing period
    period_start := sub_record.current_period_start;
    period_end := sub_record.current_period_end;
  else
    -- For free users, use monthly periods starting from first usage or account creation
    select 
      date_trunc('month', coalesce(min(created_at), now())) as period_start,
      date_trunc('month', coalesce(min(created_at), now())) + interval '1 month' as period_end
    into period_start, period_end
    from public.usage_tracking
    where user_id = user_uuid;
    
    -- If no usage yet, use current month
    if period_start is null then
      period_start := date_trunc('month', now());
      period_end := period_start + interval '1 month';
    end if;
  end if;
  
  -- Count trip generations in current period
  return query
  select 
    count(*) filter (where action_type = 'trip_generation') as trip_generations,
    period_start as current_period_start,
    period_end as current_period_end
  from public.usage_tracking
  where user_id = user_uuid
  and created_at >= period_start
  and created_at < period_end;
end;
$function$;

-- Function to check if user can generate a trip
create or replace function can_user_generate_trip(user_uuid uuid)
returns boolean
language plpgsql
security definer
as $function$
declare
  usage_record record;
  sub_record record;
begin
  -- Get current usage
  select * into usage_record from get_user_current_usage(user_uuid);
  
  -- Check if user has active subscription
  select * into sub_record
  from public.subscriptions 
  where user_id = user_uuid 
  and status = 'active'
  limit 1;
  
  -- If user has active subscription, allow unlimited generations
  if sub_record.id is not null then
    return true;
  end if;
  
  -- For free users, check if they're under the limit (5 generations)
  return coalesce(usage_record.trip_generations, 0) < 5;
end;
$function$;
