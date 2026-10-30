begin;
create temporary table booking_test_users(label text,id uuid default gen_random_uuid());
insert into booking_test_users(label) values('owner'),('coach'),('player'),('child2'),('parent'),('unverified'),('stranger');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
 select id,'booking-test-'||id||'@example.invalid',case when label='unverified' then null else now() end,'{}','{}' from booking_test_users;
insert into public.hub_staff(user_id,role) select id,label from booking_test_users where label in ('owner','coach');
insert into public.session_connect_parent_players(parent_user_id,player_user_id)
 select p.id,c.id from booking_test_users p,booking_test_users c where p.label='parent' and c.label='player';
insert into public.session_connect_calendly_hosts(calendly_user_uri,calendly_email,calendly_name,coach_user_id)
 select 'https://api.calendly.com/users/qa-booking-host','coach@example.invalid','QA Coach',id from booking_test_users where label='coach';
grant select on booking_test_users to service_role,authenticated;
do $$declare p uuid; parent_id uuid; email text;begin
  select id into p from booking_test_users where label='player';
  email:='booking-test-'||p||'@example.invalid';
  assert public.session_connect_resolve_booking_player('  '||upper(email)||'  ')=p,'Verified email is normalised';
  select id into parent_id from booking_test_users where label='parent';
  assert public.session_connect_resolve_booking_player('booking-test-'||parent_id||'@example.invalid')=p,'Single child parent matches';
  assert public.session_connect_resolve_booking_player('booking-test-'||(select id from booking_test_users where label='unverified')||'@example.invalid') is null,'Unverified email cannot match';
  assert public.session_connect_resolve_booking_player('booking-test-'||(select id from booking_test_users where label='coach')||'@example.invalid') is null,'Staff email does not become a player';
end$$;
insert into public.session_connect_parent_players(parent_user_id,player_user_id)
 select p.id,c.id from booking_test_users p,booking_test_users c where p.label='parent' and c.label='child2';
do $$begin
  assert public.session_connect_resolve_booking_player('booking-test-'||(select id from booking_test_users where label='parent')||'@example.invalid') is null,'Shared parent email stays unresolved';
end$$;
set local role service_role;
insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,external_invitee_uri,event_name,invitee_email,coach_calendly_user_uri,start_at,end_at,booking_status,source_updated_at)
 select 'qa-booking-test','https://api.calendly.com/scheduled_events/qa-booking-test','https://api.calendly.com/scheduled_events/qa-booking-test/invitees/qa-player','QA Football','booking-test-'||id||'@example.invalid','https://api.calendly.com/users/qa-booking-host',now()+interval '1 day',now()+interval '1 day 1 hour','active',now() from booking_test_users where label='player';
do $$begin
  assert (select converted_session_id is not null from public.session_connect_booking_queue where external_booking_id='qa-booking-test'),'Server creates linked session';
  assert (select count(*) from public.session_connect_sessions where external_booking_id='qa-booking-test')=1,'Exactly one session';
end$$;
-- Retry the same event with a different name/venue but preserve the exact session and coach.
insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,external_invitee_uri,event_name,invitee_email,coach_calendly_user_uri,start_at,end_at,booking_status,source_updated_at)
 select external_booking_id,external_event_uri,external_invitee_uri,event_name,invitee_email,coach_calendly_user_uri,start_at,end_at,booking_status,source_updated_at from public.session_connect_booking_queue where external_booking_id='qa-booking-test'
 on conflict(external_booking_id) do update set start_at=excluded.start_at;
do $$begin assert (select count(*) from public.session_connect_sessions where external_booking_id='qa-booking-test')=1,'Retry is idempotent';end$$;
update public.session_connect_booking_queue set booking_status='canceled',source_updated_at=now()+interval '1 minute' where external_booking_id='qa-booking-test';
do $$begin assert (select status from public.session_connect_sessions where external_booking_id='qa-booking-test')='cancelled','Cancellation propagated';end$$;
update public.session_connect_booking_queue set booking_status='active',source_updated_at=now()-interval '1 minute' where external_booking_id='qa-booking-test';
do $$begin assert (select booking_status from public.session_connect_booking_queue where external_booking_id='qa-booking-test')='canceled','Stale event cannot resurrect booking';end$$;
reset role;
update public.session_connect_sessions set status='completed',completed_at=now(),coach_feedback='Keep my feedback' where external_booking_id='qa-booking-test';
update public.session_connect_booking_queue set booking_status='canceled',source_updated_at=now()+interval '2 minutes' where external_booking_id='qa-booking-test';
do $$begin
 assert (select status='completed' and coach_feedback='Keep my feedback' from public.session_connect_sessions where external_booking_id='qa-booking-test'),'Completion and feedback survive sync';
end$$;
insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,external_invitee_uri,event_name,invitee_email,coach_calendly_user_uri,start_at,end_at,booking_status)
 select 'qa-unknown-coach','https://api.calendly.com/scheduled_events/qa-unknown-coach','https://api.calendly.com/scheduled_events/qa-unknown-coach/invitees/qa-child','Football with Billy','booking-test-'||id||'@example.invalid','https://api.calendly.com/users/qa-booking-host',now()+interval '1 day',now()+interval '1 day 1 hour','active' from booking_test_users where label='player';
do $$begin assert (select coach_user_id is null and converted_session_id is null from public.session_connect_booking_queue where external_booking_id='qa-unknown-coach'),'Named coach is not misassigned to booking host';end$$;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from booking_test_users where label='parent';
set local role authenticated;
do $$begin
 assert (select count(*) from public.session_connect_sessions where external_booking_id='qa-booking-test')=1,'Parent can read linked child session';
 assert not has_function_privilege('authenticated','public.hub_reconcile_bookings()','execute'),'Clients cannot ingest bookings';
 begin perform public.hub_link_booking(gen_random_uuid(),gen_random_uuid(),gen_random_uuid()); raise exception 'Parent unexpectedly linked a booking'; exception when raise_exception then assert sqlerrm='Manager access required'; end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from booking_test_users where label='stranger';
set local role authenticated;
do $$begin assert (select count(*) from public.session_connect_sessions where external_booking_id='qa-booking-test')=0,'Unrelated player cannot see another family';end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from booking_test_users where label='owner';
set local role authenticated;
select public.hub_link_booking((select id from public.session_connect_booking_queue where external_booking_id='qa-unknown-coach'),(select id from booking_test_users where label='player'),(select id from booking_test_users where label='coach'),false,true);
reset role;
do $$begin
 assert (select converted_session_id is not null and coach_user_id=(select id from booking_test_users where label='coach') from public.session_connect_booking_queue where external_booking_id='qa-unknown-coach'),'JT can select delivering coach and link player';
 assert (select coach_user_id=(select id from booking_test_users where label='coach') from public.hub_calendly_coach_rules where event_name='Football with Billy'),'Explicit coach rule saved';
end$$;
select 'Booking matching, cancellation, idempotency and privacy checks passed; fixtures rolled back.' as result;
rollback;
