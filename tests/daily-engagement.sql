begin;
do $test$
declare u uuid:=gen_random_uuid(); a record; b record; plan jsonb; c text; n integer;
begin
 insert into auth.users(id) values(u);
 update public.profiles set primary_position='GK',development_goal='Improve confidence' where id=u;
 perform set_config('request.jwt.claim.sub',u::text,true);
 select * into a from public.register_daily_login(); select * into b from public.register_daily_login();
 if not a.login_counted or a.reward_points<>1 or b.login_counted or b.reward_points<>0 or b.points_balance<>a.points_balance then raise exception 'Duplicate login failed'; end if;
 plan:=public.get_my_daily_challenges();
 if jsonb_array_length(plan->'challenges')<>4 then raise exception 'Expected four tasks'; end if;
 if plan->'challenges'->2->>'challenge_code' not like 'jt_daily_goalkeeper_%' or plan->'challenges'->3->>'challenge_code' not like 'jt_daily_confidence_%' then raise exception 'Personalisation failed'; end if;
 if plan<>public.get_my_daily_challenges() then raise exception 'Plan unstable'; end if;
 c:=plan->'challenges'->0->>'challenge_code';
 select * into a from public.complete_performance_challenge(c); select * into b from public.complete_performance_challenge(c);
 if not a.completed or b.completed or a.points_awarded<>1 or b.points_awarded<>0 then raise exception 'Duplicate completion failed'; end if;
 begin perform public.complete_performance_challenge('daily_hydration');raise exception 'Unassigned accepted';exception when raise_exception then if sqlerrm='Unassigned accepted' then raise;end if;end;
 update hub_private.daily_assignments set day=day-1 where user_id=u;
 plan:=public.get_my_daily_challenges();
 select count(*) into n from hub_private.daily_assignments x join hub_private.daily_assignments y on x.user_id=y.user_id and x.challenge_id=y.challenge_id and x.day=y.day+1 where x.user_id=u;
 if n<>0 then raise exception 'Yesterday repeated'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.register_daily_login();raise exception 'Anonymous accepted';exception when raise_exception then if sqlerrm='Anonymous accepted' then raise;end if;end;
end $test$;
rollback;
