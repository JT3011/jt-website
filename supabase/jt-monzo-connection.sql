-- Server-only storage. No browser role, including the owner, can read tokens.
create table if not exists public.jt_monzo_credentials (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_tokens text not null,
  account_id text,
  account_label text,
  refresh_lock text,
  refresh_until timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.jt_monzo_oauth_states (
  state_hash text primary key,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.jt_monzo_credentials enable row level security;
alter table public.jt_monzo_oauth_states enable row level security;
revoke all on public.jt_monzo_credentials, public.jt_monzo_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.jt_monzo_credentials, public.jt_monzo_oauth_states to service_role;
