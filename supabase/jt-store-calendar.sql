-- Provider tokens and calendar snapshots are server-only. No browser role can read them.
create table public.hub_provider_connections (
  provider text not null check(provider in ('shopify','calendly')),
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_token text not null,
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(provider,user_id)
);
create table public.hub_store_reward_settings (
  tier_code text primary key references public.global_reward_tiers(tier_code),
  discount_type text not null default 'percentage' check(discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) check(discount_value > 0),
  minimum_subtotal numeric(10,2) not null default 0 check(minimum_subtotal >= 0),
  valid_days integer not null default 30 check(valid_days between 1 and 365),
  active boolean not null default false,
  terms_accepted boolean not null default false,
  updated_at timestamptz not null default now(),
  check(discount_type <> 'percentage' or discount_value <= 100),
  check(not active or (discount_value is not null and terms_accepted))
);
insert into public.hub_store_reward_settings(tier_code) select tier_code from public.global_reward_tiers on conflict do nothing;
create table public.hub_store_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_code text not null references public.global_reward_tiers(tier_code),
  code text not null unique,
  status text not null default 'pending' check(status in ('pending','issued')),
  discount_snapshot jsonb not null,
  shopify_discount_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  issued_at timestamptz,
  unique(user_id,tier_code)
);
create table public.hub_coach_calendar_cache (
  coach_uri text not null,
  start_day date not null,
  days integer not null check(days between 1 and 31),
  events jsonb not null default '[]',
  synced_at timestamptz not null default now(),
  primary key(coach_uri,start_day,days)
);
alter table public.session_connect_calendly_hosts add column if not exists scheduling_url text;
alter table public.session_connect_calendly_hosts add column if not exists calendly_timezone text not null default 'Europe/London';
alter table public.session_connect_calendly_hosts add column if not exists organization_uri text;

alter table public.hub_provider_connections enable row level security;
alter table public.hub_store_reward_settings enable row level security;
alter table public.hub_store_reward_claims enable row level security;
alter table public.hub_coach_calendar_cache enable row level security;
revoke all on public.hub_provider_connections,public.hub_store_reward_settings,public.hub_store_reward_claims,public.hub_coach_calendar_cache from anon,authenticated;
grant all on public.hub_provider_connections,public.hub_store_reward_settings,public.hub_store_reward_claims,public.hub_coach_calendar_cache to service_role;
grant select on public.hub_store_reward_settings,public.hub_store_reward_claims to authenticated;
create policy shop_settings_read on public.hub_store_reward_settings for select to authenticated using (true);
create policy shop_claims_read on public.hub_store_reward_claims for select to authenticated using(user_id=(select auth.uid()) and status='issued');
create index hub_store_reward_claims_tier_idx on public.hub_store_reward_claims(tier_code);

-- The unique user/tier constraint reserves a single code even for concurrent retries.
-- Only the server may reserve or mark a code issued, after verifying the existing reward ladder.
