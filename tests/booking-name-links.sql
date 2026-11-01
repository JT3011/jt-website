begin;
create temporary table name_link_users(label text,id uuid default gen_random_uuid());
insert into name_link_users(label) values('coach'),('other_coach'),('one'),('two'),('parent'),('stranger');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
 select id,'name-link-'||id||'@example.invalid',now(),'{}','{}' from name_link_users;
insert into public.hub_staff(user_id,role) select id,'coach' from name_link_users where label in('coach','other_coach');
insert into public.profiles(id,player_name,account_type) select id,case label when 'one' then 'Name Match One' when 'two' then 'Name Match Two' else 'Fixture '||label end,case when label='parent' then 'parent' else 'player' end from name_link_users on conflict(id) do update set player_name=excluded.player_name,account_type=excluded.account_type;
insert into public.hub_apex_context(id,player_name,aliases) values
 ('recnameone0000001','Name Match One','["Parent Example (One)","One"]'),
 ('recnametwo0000002','Name Match Two','["Two"]'),
 ('recnamenoacc00003','No Account Example','["Parent Without Account"]');
insert into public.hub_airtable_players(airtable_record_id,display_name) values('recnameone0000001','Name Match One'),('recnametwo0000002','Name Match Two');
insert into public.hub_player_airtable_links(player_user_id,airtable_record_id) select id,case label when 'one' then 'recnameone0000001' else 'recnametwo0000002' end from name_link_users where label in('one','two');
insert into public.hub_coach_calendars(id,display_name,booking_url,coach_user_id)
 select 'name_link_coach','Name Link Coach','https://calendly.com/example/name-test',id from name_link_users where label='coach';
insert into public.hub_calendly_coach_rules(event_name,calendar_id,coach_user_id,display_name)
 select 'Name link fixture','name_link_coach',id,'Name Link Coach' from name_link_users where label='coach';
do $$declare one_id uuid:=(select id from name_link_users where label='one'); r jsonb;begin
 r:=private.hub_booking_player_match('  NAME-MATCH ONE ','unseen@example.invalid',null);
 assert(r->>'player')::uuid=one_id,'Exact normalized name links an existing verified player';
 r:=private.hub_booking_player_match('Parent Example (One)','unseen@example.invalid',null);
 assert(r->>'player')::uuid=one_id,'Recorded parent and child alias resolves';
 r:=private.hub_booking_player_match('Parent Without Account','unknown@example.invalid',null);
 assert r->>'airtable'='recnamenoacc00003' and r->>'player' is null,'Airtable player can match without an account';
 r:=private.hub_booking_player_match('Name Match Three','unknown@example.invalid',null);
 assert r->>'method'='unmatched','Similar name must not be guessed';
 r:=private.hub_booking_player_match('Name Match Two','name-link-'||one_id||'@example.invalid',null);
 assert r->>'method'='conflict' and r->>'player' is null,'Conflicting name and verified email cannot link';
end$$;
insert into public.hub_apex_context(id,player_name,aliases) values('recnamedupe000004','Name Match One','["One"]');
do $$begin assert private.hub_booking_name_match('One')->>'method'='ambiguous','Duplicate names require review';end$$;
update public.hub_apex_context set player_name='Unrelated Duplicate Fixture',aliases='[]' where id='recnamedupe000004';
insert into public.session_connect_parent_players(parent_user_id,player_user_id)
 select p.id,c.id from name_link_users p,name_link_users c where p.label='parent' and c.label in('one','two');
do $$declare email text:='name-link-'||(select id from name_link_users where label='parent')||'@example.invalid';r jsonb;begin
 r:=private.hub_booking_player_match('Name Match Two',email,null);
 assert(r->>'player')::uuid=(select id from name_link_users where label='two'),'Name can select the correct child within an existing verified family';
 r:=private.hub_booking_player_match('No Account Example',email,null);
 assert r->>'method'='conflict','Shared household cannot select an unrelated named player';
end$$;
insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,event_name,invitee_name,invitee_email,start_at,end_at,booking_status)
 values('name-link-known','https://api.calendly.com/scheduled_events/name-link-known','Name link fixture','Name Match One','unknown-new@example.invalid',now()+interval '1 day',now()+interval '1 day 1 hour','active'),
 ('name-link-noaccount','https://api.calendly.com/scheduled_events/name-link-noaccount','Name link fixture','Parent Without Account','unknown-new@example.invalid',now()+interval '2 days',now()+interval '2 days 1 hour','active');
do $$begin
 assert(select converted_session_id is not null and player_user_id=(select id from name_link_users where label='one') and coach_user_id=(select id from name_link_users where label='coach') from public.session_connect_booking_queue where external_booking_id='name-link-known'),'Named player booking creates the right session';
 assert(select count(*) from public.session_connect_coach_players where coach_user_id=(select id from name_link_users where label='coach') and player_user_id=(select id from name_link_users where label='one') and active)=1,'Deliving coach is automatically assigned';
 assert(select matched_player_name='No Account Example' and matched_airtable_record_id='recnamenoacc00003' and player_user_id is null and coach_user_id=(select id from name_link_users where label='coach') from public.session_connect_booking_queue where external_booking_id='name-link-noaccount'),'Unregistered player stays on the correct coach calendar';
 assert(select count(*) from public.session_connect_parent_players where parent_user_id=(select id from name_link_users where label='stranger'))=0,'Name matching never creates family access';
end$$;
insert into public.hub_session_plans(booking_id,calendar_id,session_date,title,content,status,airtable_record_id,planning_ready)
 select id,calendar_id,current_date,'Name link plan fixture','Existing draft content','draft','recnameone0000001',true from public.session_connect_booking_queue where external_booking_id='name-link-known';
update public.session_connect_booking_queue set updated_at=now() where external_booking_id like 'name-link-%';
do $$begin
 assert(select p.player_user_id=q.player_user_id and p.session_id=q.converted_session_id and p.status='draft' and p.content='Existing draft content' from public.hub_session_plans p join public.session_connect_booking_queue q on q.id=p.booking_id where q.external_booking_id='name-link-known'),'An identity-consistent plan follows the booking without publishing or rewriting it';
end$$;

do $$begin assert(select count(*) from public.session_connect_sessions where external_booking_id='name-link-known')=1,'Reconciliation cannot duplicate sessions';end$$;
-- Access is checked as real caller roles, not as a database administrator.
grant select on name_link_users to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from name_link_users where label='coach';
set local role authenticated;
do $$begin assert(select count(*) from public.session_connect_sessions where external_booking_id='name-link-known')=1,'Delivering coach sees linked session';end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from name_link_users where label='other_coach';
set local role authenticated;
do $$begin assert(select count(*) from public.session_connect_sessions where external_booking_id='name-link-known')=0,'Other coach cannot read that session';end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from name_link_users where label='stranger';
set local role authenticated;
do $$begin assert(select count(*) from public.session_connect_sessions where external_booking_id='name-link-known')=0,'Unrelated family cannot read a name-matched session';end$$;
reset role;
select 'Name linking, accountless bookings, family boundaries and coach isolation passed; fixtures rolled back.' as result;
rollback;
