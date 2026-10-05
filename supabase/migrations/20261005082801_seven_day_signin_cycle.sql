CREATE OR REPLACE FUNCTION hub_private.register_daily_login()
 RETURNS TABLE(login_counted boolean, current_streak integer, best_streak integer, points_balance integer, lifetime_points integer, reward_points integer, reward_label text, next_milestone integer, next_reward integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  current_utc_date date := (timezone('Europe/London', now()))::date;
  previous_activity_date date;
  previous_streak integer := 0;
  previous_best_streak integer := 0;
  updated_streak integer := 0;
  updated_best integer := 0;
  updated_balance integer := 0;
  updated_lifetime integer := 0;
  counted_today boolean := false;
  milestone_label text := null;
  awarded integer := 0;
  cycle_award integer := 1;
  previous_logins integer := 0;
  event_created boolean := false;
  following_milestone integer := 7;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.initialise_my_performance_profile();

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,0));

  select
    ppa.last_activity_date,
    coalesce(ppa.current_streak,0),
    coalesce(ppa.best_streak,0),
    coalesce(ppa.points_balance,0),
    coalesce(ppa.lifetime_points,0)
  into
    previous_activity_date,
    previous_streak,
    previous_best_streak,
    updated_balance,
    updated_lifetime
  from public.player_performance_accounts ppa
  where ppa.user_id = current_user_id
  for update;

  if previous_activity_date = current_utc_date then
    updated_streak := greatest(previous_streak,1);
    counted_today := false;
  elsif previous_activity_date = current_utc_date - 1 then
    updated_streak := previous_streak + 1;
    counted_today := true;
  else
    updated_streak := 1;
    counted_today := true;
  end if;

  updated_best := greatest(previous_best_streak,updated_streak);

  if counted_today then
    milestone_label := case updated_streak
      when 7 then '7 Day Hub Streak'
      when 14 then '14 Day Hub Streak'
      when 30 then '30 Day Hub Streak'
      when 60 then '60 Day Hub Streak'
      when 90 then '90 Day Hub Streak'
      else null
    end;
  end if;

  update public.player_performance_accounts ppa
  set
    current_streak = updated_streak,
    best_streak = updated_best,
    last_activity_date = current_utc_date,
    updated_at = now()
  where ppa.user_id = current_user_id;

  select count(*)::integer into previous_logins from public.performance_point_events e where e.user_id=current_user_id and e.event_type='daily_login';
  cycle_award:=case when (previous_logins+1)%7=0 then 5 else 1 end;
  insert into public.performance_point_events(user_id,event_key,event_type,points,description,metadata)
  values(current_user_id,'daily_login:'||current_utc_date::text,'daily_login',cycle_award,'Daily Hub sign-in',jsonb_build_object('day',current_utc_date,'timezone','Europe/London'))
  on conflict(user_id,event_key) do nothing returning true into event_created;
  counted_today:=coalesce(event_created,false);
  if counted_today then
    awarded:=cycle_award;
    update public.player_performance_accounts ppa set points_balance=ppa.points_balance+awarded,lifetime_points=ppa.lifetime_points+awarded where ppa.user_id=current_user_id returning ppa.points_balance,ppa.lifetime_points into updated_balance,updated_lifetime;
  end if;
  following_milestone := case
    when updated_streak < 7 then 7
    when updated_streak < 14 then 14
    when updated_streak < 30 then 30
    when updated_streak < 60 then 60
    else 90
  end;

  return query
  select counted_today, updated_streak, updated_best, updated_balance, updated_lifetime, awarded, milestone_label, following_milestone, 0;
end;
$function$
;
create or replace function hub_private.register_daily_login_cycle() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; total integer; u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required'; end if;
 select to_jsonb(r) into result from hub_private.register_daily_login() r;
 select count(*)::integer into total from public.performance_point_events e where e.user_id=u and e.event_type='daily_login';
 return result||jsonb_build_object('cycle_day',((total-1)%7)+1,'cycle_length',7,'cycle_reward',5);
end $$;
revoke all on function hub_private.register_daily_login_cycle() from public,anon;
grant execute on function hub_private.register_daily_login_cycle() to authenticated;
create or replace function public.register_daily_login_cycle() returns jsonb
language sql security invoker set search_path='' as $$ select hub_private.register_daily_login_cycle() $$;
revoke all on function public.register_daily_login_cycle() from public,anon;
grant execute on function public.register_daily_login_cycle() to authenticated;
