-- Server-only subscription confirmations and notification devices.
begin;
create table public.hub_signup_alerts (
  id text primary key,
  stripe_event_id text not null,
  stripe_subscription_id text not null,
  stripe_customer_id text not null,
  client_name text not null default '',
  client_email text not null default '',
  amount_pence integer not null check (amount_pence >= 0),
  currency text not null,
  subscription_status text not null check (subscription_status in ('active', 'trialing')),
  trial_end timestamptz,
  confirmed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index hub_signup_alerts_confirmed_idx on public.hub_signup_alerts (confirmed_at desc, id desc);
create table public.hub_signup_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null unique,
  subscription jsonb not null,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_signup_push_devices_user_idx on public.hub_signup_push_devices(user_id);
create table public.hub_signup_push_deliveries (
  signup_id text not null references public.hub_signup_alerts(id) on delete cascade,
  device_id uuid not null references public.hub_signup_push_devices(id) on delete cascade,
  lease_token uuid not null,
  leased_until timestamptz not null,
  delivered_at timestamptz,
  primary key (signup_id, device_id)
);
create index hub_signup_push_deliveries_device_idx on public.hub_signup_push_deliveries(device_id);
alter table public.hub_signup_alerts enable row level security;
alter table public.hub_signup_push_devices enable row level security;
alter table public.hub_signup_push_deliveries enable row level security;
revoke all on public.hub_signup_alerts, public.hub_signup_push_devices, public.hub_signup_push_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.hub_signup_alerts, public.hub_signup_push_devices, public.hub_signup_push_deliveries to service_role;

create function public.hub_claim_signup_delivery(p_signup text, p_device uuid)
returns table (lease_token uuid)
language sql security invoker set search_path = '' as $$
  insert into public.hub_signup_push_deliveries as delivery (signup_id, device_id, lease_token, leased_until)
  values (p_signup, p_device, gen_random_uuid(), now() + interval '45 seconds')
  on conflict (signup_id, device_id) do update
    set lease_token = excluded.lease_token, leased_until = excluded.leased_until
    where delivery.delivered_at is null and delivery.leased_until < now()
  returning delivery.lease_token;
$$;
revoke all on function public.hub_claim_signup_delivery(text, uuid) from public, anon, authenticated;
grant execute on function public.hub_claim_signup_delivery(text, uuid) to service_role;
comment on table public.hub_signup_alerts is 'Server-only checkout confirmations. Owner authorization is enforced by hub-portal.';
commit;
