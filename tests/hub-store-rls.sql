-- All fixtures are transactional and rolled back, including auth accounts.
begin;
create temporary table store_test_users(label text,id uuid default gen_random_uuid());
insert into store_test_users(label) values('player'),('other');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
select id,'store-test-'||id||'@example.invalid',now(),'{}','{}' from store_test_users;
grant select on store_test_users to authenticated;
insert into public.hub_store_reward_claims(user_id,tier_code,code,status,discount_snapshot,expires_at)
select id,'foundation','TEST-'||id,'issued','{}',now()+interval '1 day' from store_test_users;
insert into public.hub_store_reward_claims(user_id,tier_code,code,status,discount_snapshot,expires_at)
select id,'committed','PENDING-'||id,'pending','{}',now()+interval '1 day' from store_test_users where label='player';
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated','user_metadata',json_build_object('role','owner'))::text,true) from store_test_users where label='player';
set local role authenticated;
do $$ begin
 assert (select count(*) from public.hub_store_reward_claims where code like 'TEST-%')=1,'Only own issued code is readable';
 assert (select count(*) from public.hub_store_reward_claims where code like 'PENDING-%')=0,'Pending code is not exposed';
 assert not has_table_privilege(current_user,'public.hub_store_reward_claims','INSERT'),'Cannot reserve own code';
 assert not has_table_privilege(current_user,'public.hub_store_reward_claims','UPDATE'),'Cannot issue own code';
 assert not has_table_privilege(current_user,'public.hub_store_reward_settings','UPDATE'),'Cannot edit discount settings';
 assert not has_table_privilege(current_user,'public.hub_provider_connections','SELECT'),'Credentials remain private';
 assert not has_table_privilege(current_user,'public.hub_coach_calendar_cache','SELECT'),'Calendars remain server-only';
 assert (select count(*) from public.hub_store_reward_settings)>0,'Settings can be read';
end $$;
reset role;
set local role anon;
do $$ begin
 assert not has_table_privilege(current_user,'public.hub_store_reward_claims','SELECT'),'Anonymous cannot read codes';
 assert not has_table_privilege(current_user,'public.hub_provider_connections','SELECT'),'Anonymous cannot read tokens';
 assert not has_table_privilege(current_user,'public.hub_coach_calendar_cache','SELECT'),'Anonymous cannot read calendars';
end $$;
reset role;
select 'All store RLS checks passed. Fixtures rolled back.' as result;
rollback;
