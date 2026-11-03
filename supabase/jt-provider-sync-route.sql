-- Reuse an existing API function within the current hosting plan.
create or replace function private.request_provider_sync() returns uuid language plpgsql security invoker set search_path='' as $$
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
