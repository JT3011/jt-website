begin;
do $test$
declare u uuid; n integer; i integer; a jsonb; b jsonb; d date:=(now() at time zone 'Europe/London')::date; expected integer;
begin
 foreach n in array array[1,6,7,8,14,15] loop
  u:=gen_random_uuid();insert into auth.users(id) values(u);
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.initialise_my_performance_profile();
  for i in 1..n-1 loop
   insert into public.performance_point_events(user_id,event_key,event_type,points,description) values(u,'daily_login:'||(d-(n-i+3))::text,'daily_login',1,'Rollback-only test');
  end loop;
  update public.player_performance_accounts set current_streak=4,best_streak=4,last_activity_date=d-4 where user_id=u;
  a:=public.register_daily_login_cycle();b:=public.register_daily_login_cycle();
  expected:=case when n%7=0 then 5 else 1 end;
  if (a->>'cycle_day')::integer<>((n-1)%7)+1 then raise exception 'Cycle failed at %',n;end if;
  if (a->>'reward_points')::integer<>expected or not (a->>'login_counted')::boolean then raise exception 'Reward failed at %',n;end if;
  if (a->>'current_streak')::integer<>1 then raise exception 'Missed-day streak not reset';end if;
  if (b->>'login_counted')::boolean or (b->>'reward_points')::integer<>0 or b->>'points_balance'<>a->>'points_balance' or b->>'cycle_day'<>a->>'cycle_day' then raise exception 'Duplicate counted';end if;
 end loop;
end $test$;
rollback;
