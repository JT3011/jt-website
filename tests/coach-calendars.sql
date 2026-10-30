begin;
create temporary table calendar_test_users(label text,id uuid default gen_random_uuid());
insert into calendar_test_users(label) values('owner'),('billy'),('player'),('stranger');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
 select id,'calendar-test-'||id||'@example.invalid',case when label='billy' then null else now() end,'{}','{}' from calendar_test_users;
insert into public.hub_staff(user_id,role) select id,'owner' from calendar_test_users where label='owner';
insert into public.hub_coach_calendars(id,display_name,booking_url,calendly_host_uri,host_default)
 values('qa-billy','QA Billy','https://calendly.com/jt-mind-body-balance/qa-billy','https://api.calendly.com/users/603861c2-aae4-483c-917b-5d6b850bbfb7',false);
insert into public.hub_calendly_coach_rules(event_name,calendar_id,display_name) values('QA Billy calendar session','qa-billy','QA Billy');
insert into public.session_connect_booking_queue(external_booking_id,external_event_uri,external_invitee_uri,event_name,invitee_email,coach_calendly_user_uri,start_at,end_at,booking_status)
 select 'qa-calendar-booking','https://api.calendly.com/scheduled_events/qa-calendar-booking','https://api.calendly.com/scheduled_events/qa-calendar-booking/invitees/qa-player','QA Billy calendar session','calendar-test-'||id||'@example.invalid','https://api.calendly.com/users/603861c2-aae4-483c-917b-5d6b850bbfb7',now()+interval '40 days',now()+interval '40 days 1 hour','active' from calendar_test_users where label='player';
do $$begin
 assert (select calendar_id='qa-billy' and coach_user_id is null and player_user_id=(select id from calendar_test_users where label='player') from public.session_connect_booking_queue where external_booking_id='qa-calendar-booking'),'Booking is in Billy calendar, linked player preserved, never assigned to JT';
end$$;
grant select on calendar_test_users to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from calendar_test_users where label='stranger';
set local role authenticated;
do $$begin
 assert not has_table_privilege('authenticated','public.hub_coach_calendars','select'),'Coach login directory is private';
 begin perform public.hub_set_coach_calendar_email('qa-billy','attacker@example.invalid');raise exception 'Unexpected access';exception when raise_exception then assert sqlerrm='Only the CEO can assign coach logins';end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from calendar_test_users where label='owner';
set local role authenticated;
select public.hub_set_coach_calendar_email('qa-billy','  CALENDAR-TEST-'||(select id from calendar_test_users where label='billy')||'@EXAMPLE.INVALID  ');
reset role;
do $$begin
 assert not exists(select 1 from public.hub_staff where user_id=(select id from calendar_test_users where label='billy')),'Unverified coach is not granted access';
 assert (select coach_user_id is null from public.hub_coach_calendars where id='qa-billy'),'Unverified coach is not connected';
 assert (select calendly_user_uri is null from public.session_connect_coach_invites where email='calendar-test-'||(select id from calendar_test_users where label='billy')||'@example.invalid'),'Shared JT host is not transferred to Billy';
end$$;
update auth.users set email_confirmed_at=now() where id=(select id from calendar_test_users where label='billy');
do $$begin
 assert (select role='coach' from public.hub_staff where user_id=(select id from calendar_test_users where label='billy')),'Verified approved coach activated';
 assert (select coach_user_id=(select id from calendar_test_users where label='billy') from public.hub_coach_calendars where id='qa-billy'),'Verified coach linked to own calendar';
 assert (select coach_user_id=(select id from calendar_test_users where label='billy') and converted_session_id is not null from public.session_connect_booking_queue where external_booking_id='qa-calendar-booking'),'Existing booking assigned automatically after verification';
 assert (select h.coach_user_id=c.coach_user_id from public.session_connect_calendly_hosts h join public.hub_coach_calendars c on c.calendly_host_uri=h.calendly_user_uri where c.id='jt'),'JT retains own Calendly host';
end$$;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from calendar_test_users where label='billy';
set local role authenticated;
do $$begin
 begin perform public.hub_set_coach_calendar_email('charlie','attacker@example.invalid');raise exception 'Unexpected access';exception when raise_exception then assert sqlerrm='Only the CEO can assign coach logins';end;
end$$;
reset role;
select 'Coach calendar identity, verification and CEO-only access checks passed; fixtures rolled back.' as result;
rollback;
