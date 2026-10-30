begin;
create temporary table plan_test_users(label text,id uuid default gen_random_uuid());
insert into plan_test_users(label) values('owner'),('coach'),('other_coach'),('player'),('other_player'),('parent'),('stranger');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) select id,'plan-test-'||id||'@example.invalid',now(),'{}','{}' from plan_test_users;
insert into public.hub_staff(user_id,role) select id,case when label='owner' then 'owner' else 'coach' end from plan_test_users where label in('owner','coach','other_coach');
insert into public.session_connect_coach_players(coach_user_id,player_user_id) select c.id,p.id from plan_test_users c,plan_test_users p where c.label in('coach','other_coach') and p.label='player';
insert into public.session_connect_parent_players(parent_user_id,player_user_id) select a.id,p.id from plan_test_users a,plan_test_users p where a.label='parent' and p.label='player';
create temporary table plan_test_sessions(label text,id uuid default gen_random_uuid());
insert into plan_test_sessions(label) values('own'),('other'),('draft');
insert into public.session_connect_sessions(id,player_user_id,coach_user_id,start_at,end_at,session_type,source)
select s.id,p.id,c.id,now()+interval '1 day',now()+interval '1 day 1 hour','Plan test','manual' from plan_test_sessions s,plan_test_users p,plan_test_users c where p.label='player' and c.label=case when s.label='other' then 'other_coach' else 'coach' end;
insert into public.hub_session_plans(session_id,player_user_id,session_date,title,content,status)
select s.id,p.id,current_date,'plan-test-'||s.label,'Private test content',case when s.label='draft' then 'draft' else 'published' end from plan_test_sessions s,plan_test_users p where p.label='player';
insert into public.profiles(id,account_type,player_name) select id,'player','Plan fixture' from plan_test_users where label in('player','other_player') on conflict(id) do update set account_type='parent';
insert into public.hub_coach_calendars(id,display_name,booking_url,coach_user_id) select 'plan_test_cal','Plan test coach','https://calendly.com/example/test',id from plan_test_users where label='coach';
insert into public.hub_session_plans(player_user_id,calendar_id,session_date,title,content,status) select id,'plan_test_cal',current_date,'plan-test-archive','Archived proposed plan','published' from plan_test_users where label='player';
insert into public.hub_session_plans(session_date,title,content,status) values(current_date,'plan-test-pending','Unmatched private plan','draft');
grant select on plan_test_users,plan_test_sessions to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from plan_test_users where label='coach';
set local role authenticated;
do $$declare v_plan public.hub_session_plans;begin
  assert (select count(*) from public.hub_session_plans where title like 'plan-test-%')=3,'Coach sees own sessions only, even if both coaches share this player';
  select * into v_plan from public.hub_session_plans where title='plan-test-own';
  perform public.hub_save_session_plan(v_plan.id,null,v_plan.title,'Updated objective','Updated plan','published',v_plan.revision);
  begin
    perform public.hub_save_session_plan(v_plan.id,null,v_plan.title,'','stale change','draft',v_plan.revision);
    raise exception 'Stale update was accepted';
  exception when raise_exception then if sqlerrm<>'Plan changed; reload before saving' then raise; end if;end;
  begin
    perform public.hub_save_session_plan(null,(select id from plan_test_sessions where label='other'),'Forbidden','','Forbidden','draft',0);
    raise exception 'Another coach session was editable';
  exception when raise_exception then if sqlerrm<>'Session plan access denied' then raise; end if;end;
  begin
    update public.hub_session_plans set player_user_id=(select id from plan_test_users where label='other_player');
    raise exception 'Direct identity rewrite permitted';
  exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from plan_test_users where label='parent';
set local role authenticated;
do $$begin
 assert(select count(*) from public.hub_session_plans where title like 'plan-test-%')=3,'Parent sees published plans for own player, never draft';
 begin
 perform public.hub_save_session_plan((select id from public.hub_session_plans where title='plan-test-own'),null,'Forbidden','','Forbidden','published',2);
 raise exception 'Parent edit permitted';
 exception when raise_exception then if sqlerrm<>'Session plan access denied' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated','user_metadata',json_build_object('role','owner'))::text,true) from plan_test_users where label='stranger';
set local role authenticated;
do $$begin assert(select count(*) from public.hub_session_plans where title like 'plan-test-%')=0,'Unrelated account cannot see plans despite forged owner metadata';end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from plan_test_users where label='coach';
update public.session_connect_coach_players set active=false where coach_user_id=(select id from plan_test_users where label='coach');
set local role authenticated;
do $$begin assert(select count(*) from public.hub_session_plans where title like 'plan-test-%')=0,'Revoked coach immediately loses plan access';end$$;
reset role;
-- Moving a booking to another player must never expose the previous player's plan.
update public.session_connect_sessions set player_user_id=(select id from plan_test_users where label='other_player') where id=(select id from plan_test_sessions where label='own');
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from plan_test_users where label='other_player';
set local role authenticated;
do $$begin assert(select count(*) from public.hub_session_plans where title like 'plan-test-%')=0,'Reassigned booking cannot leak the prior player plan';end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from plan_test_users where label='owner';
set local role authenticated;
do $$begin assert(select count(*) from public.hub_session_plans where title like 'plan-test-%')=5,'JT retains all session plans'; perform public.hub_link_session_plan((select id from public.hub_session_plans where title='plan-test-pending'),(select id from plan_test_users where label='player'),'plan_test_cal',1); assert(select status='draft' and player_user_id=(select id from plan_test_users where label='player') from public.hub_session_plans where title='plan-test-pending'),'Owner can connect an import without automatically publishing';end$$;
reset role;
set local role anon;
do $$begin
 begin perform count(*) from public.hub_session_plans;raise exception 'Anonymous table read permitted';exception when insufficient_privilege then null;end;
 begin perform public.hub_save_session_plan(null,null,'Bad','','Bad','draft',0);raise exception 'Anonymous RPC permitted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Session plan privacy checks passed; all fixtures rolled back.' as result;
rollback;
