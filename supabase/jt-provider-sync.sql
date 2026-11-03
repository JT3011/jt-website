-- Automatic provider refreshes use the existing encrypted connections.
-- Only the server can claim work; no provider or service credentials enter cron SQL.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table public.hub_provider_sync_state (
 key text primary key, lease_id uuid, lease_until timestamptz,
 next_due timestamptz not null default now(), last_success timestamptz,
 last_error text, cache jsonb not null default '{}'::jsonb
);
create table public.hub_provider_sync_jobs (
 id uuid primary key default gen_random_uuid(), ticket_hash text not null unique,
 status text not null default 'queued' check(status in ('queued','running','complete','failed')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes',
 finished_at timestamptz, detail text
);
alter table public.hub_provider_sync_state enable row level security;
alter table public.hub_provider_sync_jobs enable row level security;
revoke all on public.hub_provider_sync_state,public.hub_provider_sync_jobs from public,anon,authenticated;
grant all on public.hub_provider_sync_state,public.hub_provider_sync_jobs to service_role;

create function public.hub_claim_provider_sync(p_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.hub_provider_sync_state%rowtype; ticket uuid;
begin
 if length(p_key)>500 or p_key !~ '^(calendly:|airtable:credits$)' then raise exception 'Invalid sync key'; end if;
 insert into public.hub_provider_sync_state(key) values(p_key) on conflict do nothing;
 select * into s from public.hub_provider_sync_state where key=p_key for update;
 if s.lease_until>now() or s.next_due>now() then
  return jsonb_build_object('acquired',false,'running',coalesce(s.lease_until>now(),false),'last_success',s.last_success,'last_error',s.last_error);
 end if;
 ticket:=gen_random_uuid();
 update public.hub_provider_sync_state set lease_id=ticket,lease_until=now()+interval '5 minutes' where key=p_key;
 return jsonb_build_object('acquired',true,'lease_id',ticket,'cache',s.cache,'last_success',s.last_success);
end;$$;
revoke all on function public.hub_claim_provider_sync(text) from public,anon,authenticated;
grant execute on function public.hub_claim_provider_sync(text) to service_role;

create function public.hub_finish_provider_sync(p_key text,p_lease uuid,p_success boolean,p_seconds integer,p_cache jsonb,p_error text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 update public.hub_provider_sync_state set
  lease_id=null,lease_until=null,next_due=now()+make_interval(secs=>greatest(30,least(3600,p_seconds))),
  last_success=case when p_success then now() else last_success end,
  last_error=case when p_success then null else left(coalesce(p_error,'Refresh unavailable.'),200) end,
  cache=case when p_success then coalesce(p_cache,'{}'::jsonb) else cache end
 where key=p_key and lease_id=p_lease;
end;$$;
revoke all on function public.hub_finish_provider_sync(text,uuid,boolean,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.hub_finish_provider_sync(text,uuid,boolean,integer,jsonb,text) to service_role;

-- Run before the existing matching trigger, so an old scan cannot change a
-- linked session after a newer cancellation webhook has already been saved.
create function private.hub_guard_booking_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare prior public.session_connect_booking_queue%rowtype;
begin
 if tg_op='INSERT' then
  select * into prior from public.session_connect_booking_queue where external_booking_id=new.external_booking_id for update;
 else prior:=old; end if;
 if prior.id is not null and (prior.last_seen_at>new.last_seen_at or
   (prior.source_updated_at is not null and new.source_updated_at is not null and prior.source_updated_at>new.source_updated_at)) then return null; end if;
 return new;
end;$$;
revoke all on function private.hub_guard_booking_snapshot() from public,anon,authenticated;
create trigger aa_hub_guard_booking_snapshot before insert or update on public.session_connect_booking_queue
for each row execute function private.hub_guard_booking_snapshot();

create function public.hub_apply_calendly_scan(p_host text,p_start timestamptz,p_end timestamptz,p_started timestamptz,p_rows jsonb,p_active text[]) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_rows)<>'array' or p_active is null or p_started>now()+interval '1 minute' then raise exception 'Invalid scan'; end if;
 insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,external_invitee_uri,event_type_uri,event_name,invitee_name,invitee_email,invitee_phone,coach_calendly_user_uri,coach_email,start_at,end_at,venue,booking_status,source_updated_at,last_seen_at)
 select r.external_booking_id,r.external_event_uri,r.external_invitee_uri,r.event_type_uri,r.event_name,r.invitee_name,r.invitee_email,r.invitee_phone,r.coach_calendly_user_uri,r.coach_email,r.start_at,r.end_at,r.venue,r.booking_status,r.source_updated_at,p_started
 from jsonb_populate_recordset(null::public.session_connect_booking_queue,p_rows) r
 order by r.external_booking_id
 on conflict(external_booking_id) do update set
  external_event_uri=excluded.external_event_uri,external_invitee_uri=excluded.external_invitee_uri,event_type_uri=excluded.event_type_uri,
  event_name=excluded.event_name,invitee_name=excluded.invitee_name,invitee_email=excluded.invitee_email,invitee_phone=excluded.invitee_phone,
  coach_calendly_user_uri=excluded.coach_calendly_user_uri,coach_email=excluded.coach_email,start_at=excluded.start_at,end_at=excluded.end_at,
  venue=excluded.venue,booking_status=excluded.booking_status,source_updated_at=excluded.source_updated_at,last_seen_at=excluded.last_seen_at;
 update public.session_connect_booking_queue set booking_status='canceled',last_seen_at=p_started
 where coach_calendly_user_uri=p_host and start_at>=p_start and (p_end is null or start_at<p_end)
  and booking_status='active' and last_seen_at<=p_started and not(external_booking_id=any(p_active));
end;$$;
revoke all on function public.hub_apply_calendly_scan(text,timestamptz,timestamptz,timestamptz,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.hub_apply_calendly_scan(text,timestamptz,timestamptz,timestamptz,jsonb,text[]) to service_role;

create function private.request_provider_sync() returns uuid language plpgsql security invoker set search_path='' as $$
declare ticket text; job_id uuid;
begin
 if not pg_try_advisory_xact_lock(hashtext('jt-provider-sync-dispatch')) then return null; end if;
 if exists(select 1 from public.hub_provider_sync_jobs where status in ('queued','running') and expires_at>now()) then return null; end if;
 if not exists(select 1 from public.hub_provider_connections where provider in ('calendly','airtable')) then return null; end if;
 delete from public.hub_provider_sync_jobs where created_at<now()-interval '14 days';
 ticket:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.hub_provider_sync_jobs(ticket_hash) values(encode(extensions.digest(ticket,'sha256'),'hex')) returning id into job_id;
 perform net.http_post(url:='https://jt-website-orpin.vercel.app/api/hub-airtable?job=provider-sync',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||ticket),body:='{}'::jsonb,timeout_milliseconds:=300000);
 return job_id;
end;$$;
revoke all on function private.request_provider_sync() from public,anon,authenticated;
grant execute on function private.request_provider_sync() to service_role;
-- Activate only after the matching production endpoint is deployed.
select cron.schedule('jt-hub-provider-sync','* * * * *','select private.request_provider_sync();');
select cron.alter_job((select jobid from cron.job where jobname='jt-hub-provider-sync'),active:=false);
