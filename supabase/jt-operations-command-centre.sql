create schema if not exists private;

create or replace function private.jt_ops_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hub_staff
    where user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function private.jt_ops_is_owner() from public;
grant usage on schema private to authenticated;
grant execute on function private.jt_ops_is_owner() to authenticated;

create table if not exists public.jt_ops_connections (
  id text primary key,
  label text not null,
  status text not null default 'action_required'
    check (status in ('connected','action_required','paused','error')),
  auto_enabled boolean not null default false,
  status_detail text not null default '',
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.jt_ops_automation_settings (
  automation_key text primary key,
  label text not null,
  enabled boolean not null default false,
  mode text not null default 'automatic'
    check (mode in ('automatic','review','paused')),
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.jt_ops_payments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  player_name text,
  amount_pence integer not null check (amount_pence > 0),
  method text not null check (method in ('cash','monzo','bank','stripe','other')),
  status text not null default 'confirmed'
    check (status in ('pending','matched','confirmed','refunded')),
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jt_ops_message_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  player_name text,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','email','sms','other')),
  task_type text not null default 'follow_up',
  summary text not null,
  status text not null default 'open'
    check (status in ('open','prepared','sent','closed')),
  due_at timestamptz,
  external_thread_id text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jt_ops_content_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null default 'all',
  caption text not null default '',
  status text not null default 'draft'
    check (status in ('draft','ready','scheduled','published','failed')),
  scheduled_for timestamptz,
  external_post_id text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jt_ops_activity_log (
  id bigint generated always as identity primary key,
  event_type text not null,
  source text not null,
  summary text not null,
  outcome text not null default 'success'
    check (outcome in ('success','attention','failed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.jt_ops_connections enable row level security;
alter table public.jt_ops_automation_settings enable row level security;
alter table public.jt_ops_payments enable row level security;
alter table public.jt_ops_message_tasks enable row level security;
alter table public.jt_ops_content_queue enable row level security;
alter table public.jt_ops_activity_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'jt_ops_connections','jt_ops_automation_settings','jt_ops_payments',
    'jt_ops_message_tasks','jt_ops_content_queue','jt_ops_activity_log'
  ] loop
    execute format('drop policy if exists jt_owner_all on public.%I', t);
    execute format(
      'create policy jt_owner_all on public.%I for all to authenticated using ((select private.jt_ops_is_owner())) with check ((select private.jt_ops_is_owner()))',
      t
    );
  end loop;
end $$;

grant select, insert, update, delete on public.jt_ops_connections to authenticated;
grant select, insert, update, delete on public.jt_ops_automation_settings to authenticated;
grant select, insert, update, delete on public.jt_ops_payments to authenticated;
grant select, insert, update, delete on public.jt_ops_message_tasks to authenticated;
grant select, insert, update, delete on public.jt_ops_content_queue to authenticated;
grant select, insert on public.jt_ops_activity_log to authenticated;
grant usage, select on sequence public.jt_ops_activity_log_id_seq to authenticated;

insert into public.jt_ops_connections (id,label,status,auto_enabled,status_detail)
values
  ('calendly','Calendly','action_required',false,'Connected to JT in ChatGPT; the Hub still needs a server authorisation.'),
  ('whatsapp','WhatsApp Business','action_required',false,'iPhone Business app detected. Meta Business Platform coexistence setup is required.'),
  ('monzo','Monzo Business','action_required',false,'Secure read-only bank authorisation is required.'),
  ('buffer','Social publishing','action_required',false,'Buffer is connected to JT in ChatGPT; the Hub still needs a server authorisation.'),
  ('chatgpt','JT AI team','action_required',false,'Private Hub tools must be deployed before agents can share live operational state.'),
  ('airtable','Airtable','action_required',false,'Field mapping and a server authorisation are required before two-way sync.')
on conflict (id) do nothing;

insert into public.jt_ops_automation_settings (automation_key,label,enabled,mode,description)
values
  ('booking_sync','Booking sync',false,'automatic','Import, update and cancel Calendly sessions.'),
  ('payment_matching','Payment matching',false,'automatic','Match incoming Monzo payments to clients; ambiguous matches stay open.'),
  ('whatsapp_messages','WhatsApp reminders',false,'automatic','Send approved booking and payment templates.'),
  ('social_publishing','Social publishing',false,'automatic','Publish ready Pulse and Forge content through Buffer.'),
  ('ai_briefings','AI team briefings',false,'automatic','Share authorised operational summaries with Nova, Sharon, Atlas, Aurora, Pulse and Forge.')
on conflict (automation_key) do nothing;
