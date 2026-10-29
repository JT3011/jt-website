-- Transactional integration tests: temporary accounts and data are rolled back.
begin;
create temporary table portal_test_users(label text, id uuid default gen_random_uuid());
insert into portal_test_users(label) values ('owner'),('coach'),('player'),('parent'),('other');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
select id,'portal-test-'||id||'@example.invalid',now(),'{}','{}' from portal_test_users;
insert into public.hub_staff(user_id,role) select id,label from portal_test_users where label in ('owner','coach');
insert into public.session_connect_coach_players(coach_user_id,player_user_id)
select c.id,p.id from portal_test_users c,portal_test_users p where c.label='coach' and p.label='player';
insert into public.session_connect_parent_players(parent_user_id,player_user_id)
select c.id,p.id from portal_test_users c,portal_test_users p where c.label='parent' and p.label='player';
insert into public.hub_airtable_players(airtable_record_id,display_name,credits)
values('recTESTPORTAL0001','Portal test','[{"service":"Football","remaining":4}]');
insert into public.hub_player_airtable_links(player_user_id,airtable_record_id)
select id,'recTESTPORTAL0001' from portal_test_users where label='player';
insert into public.hub_player_programmes(player_user_id,kind,title,content,status)
select id,'gym','Test gym','Test instructions','published' from portal_test_users where label='player';
insert into public.hub_player_programmes(player_user_id,kind,title,content,status)
select id,'nutrition','Private draft','Test draft instructions','draft' from portal_test_users where label='player';
grant select on portal_test_users to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from portal_test_users where label='player';
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=1,'Player sees only published plan';
  assert (select count(*) from public.hub_airtable_players where airtable_record_id='recTESTPORTAL0001')=1,'Player reads own credits';
  update public.hub_player_programmes set content='Forbidden' where title='Test gym';
  assert not found,'Player cannot update own programme';
  begin
    update public.hub_airtable_players set credits='[]' where airtable_record_id='recTESTPORTAL0001';
    raise exception 'Credits unexpectedly editable';
  exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from portal_test_users where label='parent';
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=1,'Parent reads published linked plan';
  assert (select count(*) from public.hub_airtable_players where airtable_record_id='recTESTPORTAL0001')=1,'Parent reads linked credits';
  update public.hub_player_programmes set content='Forbidden' where title='Test gym';
  assert not found,'Parent cannot edit programme';
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated','user_metadata',json_build_object('role','owner'))::text,true) from portal_test_users where label='other';
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=0,'Unrelated player cannot read any plans';
  assert (select count(*) from public.hub_airtable_players where airtable_record_id='recTESTPORTAL0001')=0,'Unrelated player cannot read credits';
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from portal_test_users where label='coach';
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=2,'Assigned coach sees drafts';
  update public.hub_player_programmes set content='Updated by coach' where title='Test gym';
  assert found,'Assigned coach can edit';
  begin
    insert into public.hub_player_programmes(player_user_id,kind,title,content)
    select id,'gym','Forbidden','Forbidden' from portal_test_users where label='other';
    raise exception 'Unassigned player was editable';
  exception when insufficient_privilege then null; end;
end$$;
reset role;
-- Revoking an assignment removes both read and write access immediately.
update public.session_connect_coach_players set active=false where coach_user_id=(select id from portal_test_users where label='coach');
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=0,'Revoked coach loses access';
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from portal_test_users where label='owner';
set local role authenticated;
do $$begin
  assert (select count(*) from public.hub_player_programmes where title in ('Test gym','Private draft'))=2,'Owner sees all plans';
end$$;
reset role;
select 'All portal RLS checks passed; fixtures rolled back.' as result;
rollback;
