create extension if not exists pg_net with schema extensions;
create table public.jt_monzo_sync_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 ticket_hash text not null unique, expires_at timestamptz not null default now()+interval '5 minutes',
 status text not null default 'queued' check(status in ('queued','running','complete','failed')),
 created_at timestamptz not null default now(), finished_at timestamptz, detail text
);
create table public.jt_monzo_feed_settings (
 owner_id uuid primary key references auth.users(id), baseline_at timestamptz not null default now(), last_synced_at timestamptz
);
create table public.jt_monzo_transactions (
 id text primary key, owner_id uuid not null references auth.users(id), amount integer not null,
 currency text not null, description text not null, created timestamptz not null, settled boolean not null,
 reconciliation text not null default 'review' check(reconciliation in ('baseline','review','applied','excluded')),
 airtable_record_id text, reconciliation_note text, updated_at timestamptz not null default now()
);
alter table public.jt_monzo_sync_jobs enable row level security;
alter table public.jt_monzo_feed_settings enable row level security;
alter table public.jt_monzo_transactions enable row level security;
revoke all on public.jt_monzo_sync_jobs,public.jt_monzo_feed_settings,public.jt_monzo_transactions from public,anon,authenticated;
grant all on public.jt_monzo_sync_jobs,public.jt_monzo_feed_settings,public.jt_monzo_transactions to service_role;
grant select on public.jt_monzo_transactions,public.jt_monzo_feed_settings to authenticated;
create policy monzo_feed_owner on public.jt_monzo_transactions for select to authenticated using(owner_id=auth.uid() and private.jt_ops_is_owner());
create policy monzo_settings_owner on public.jt_monzo_feed_settings for select to authenticated using(owner_id=auth.uid() and private.jt_ops_is_owner());
grant update(last_synced_at) on public.jt_ops_connections to service_role;
insert into public.jt_monzo_feed_settings(owner_id) select user_id from public.hub_staff where role='owner' on conflict do nothing;
create or replace function private.request_monzo_sync() returns uuid language plpgsql security invoker set search_path='' as $$
declare v_owner uuid; v_ticket text; v_id uuid;
begin
 select user_id into strict v_owner from public.hub_staff where role='owner';
 if exists(select 1 from public.jt_monzo_sync_jobs where status in ('queued','running') and created_at>now()-interval '5 minutes') then raise exception 'A bank sync is already running'; end if;
 v_ticket:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.jt_monzo_sync_jobs(owner_id,ticket_hash) values(v_owner,encode(extensions.digest(v_ticket,'sha256'),'hex')) returning id into v_id;
 perform net.http_post(url:='https://jt-website-orpin.vercel.app/api/monzo/job',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_ticket),body:='{}'::jsonb,timeout_milliseconds:=60000);
 return v_id;
end $$;
revoke all on function private.request_monzo_sync() from public,anon,authenticated;
grant execute on function private.request_monzo_sync() to service_role;
create or replace function public.jt_monzo_ingest(p_owner uuid,p_rows jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.jt_monzo_transactions(id,owner_id,amount,currency,description,created,settled,reconciliation)
 select r.id,p_owner,r.amount,r.currency,r.description,r.created,r.settled,
 case when r.created<=s.baseline_at then 'baseline' when r.amount<=0 then 'excluded' else 'review' end
 from jsonb_to_recordset(p_rows) as r(id text,amount integer,currency text,description text,created timestamptz,settled boolean)
 cross join public.jt_monzo_feed_settings s where s.owner_id=p_owner
 on conflict(id) do update set amount=excluded.amount,currency=excluded.currency,description=excluded.description,settled=excluded.settled,updated_at=now()
 where public.jt_monzo_transactions.owner_id=p_owner;
end $$;
revoke all on function public.jt_monzo_ingest(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.jt_monzo_ingest(uuid,jsonb) to service_role;
