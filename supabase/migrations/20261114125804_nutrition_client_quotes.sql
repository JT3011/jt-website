-- Individual nutrition quotes. Payment collection is separate.
begin;
create table public.hub_nutrition_quotes (
 id uuid primary key default gen_random_uuid(),
 client_email text not null unique check (client_email = lower(btrim(client_email)) and length(client_email) between 3 and 254),
 client_name text not null check (length(btrim(client_name)) between 1 and 100),
 amount_pence integer not null check (amount_pence between 0 and 1000000),
 billing text not null check (billing in ('one_off','monthly')),
 description text not null check (length(btrim(description)) between 1 and 1000),
 active boolean not null default true,
 revision integer not null default 1 check (revision > 0),
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index hub_nutrition_quotes_updated on public.hub_nutrition_quotes(updated_at desc,id);
create index hub_nutrition_quotes_created_by on public.hub_nutrition_quotes(created_by);
create index hub_nutrition_quotes_updated_by on public.hub_nutrition_quotes(updated_by);
alter table public.hub_nutrition_quotes enable row level security;
-- No browser may bypass the server's owner check or verified-email lookup.
revoke all on table public.hub_nutrition_quotes from public,anon,authenticated,service_role;
grant select,insert,update on table public.hub_nutrition_quotes to service_role;
create policy nutrition_quotes_server_only on public.hub_nutrition_quotes
 for all to authenticated using (false) with check (false);
comment on table public.hub_nutrition_quotes is 'Client-specific nutrition quotes. Server-only; owner writes and exact verified-email client reads. Does not represent payment or a subscription.';
commit;
