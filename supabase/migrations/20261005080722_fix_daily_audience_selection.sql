create or replace function hub_private.my_daily_challenges() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); d date:=(now() at time zone 'Europe/London')::date;
 p text; g text; pos text; goal text; s integer; chosen_audience text; chosen uuid; result jsonb; used integer;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select lower(coalesce(primary_position,'')||' '||coalesce(secondary_position,'')),lower(coalesce(development_goal,'')) into p,g from public.profiles where id=u;
 pos:=case when p ~ '(goal|keeper|(^| )gk( |$))' then 'goalkeeper'
 when p ~ '(back|defen|(^| )(cb|lb|rb|lwb|rwb)( |$))' then 'defender'
 when p ~ '(mid|(^| )(cm|cdm|cam|lm|rm)( |$))' then 'midfielder'
 when p ~ '(wing|strik|forward|attack|(^| )(st|cf|lw|rw)( |$))' then 'attacker' else 'general' end;
 goal:=case when g ~ '(confiden|mental|mind|anx|calm)' then 'confidence'
 when g ~ '(fit|speed|strong|strength|stamina|power|endurance)' then 'fitness'
 when g ~ '(pass|touch|shoot|finish|dribbl|cross|techni|skill)' then 'skill' else 'progress' end;
 for s in 1..4 loop
  if exists(select 1 from hub_private.daily_assignments a where a.user_id=u and a.day=d and a.slot=s) then continue; end if;
  chosen_audience:=case when s<=2 then 'quick' when s=3 then pos else goal end;
  select c.challenge_id into chosen from hub_private.daily_catalog c
  join public.performance_challenges pc on pc.id=c.challenge_id and pc.is_active
  where c.audience=chosen_audience and not exists(select 1 from hub_private.daily_assignments a where a.user_id=u and a.day=d and a.challenge_id=c.challenge_id)
  order by coalesce((select max(a.day) from hub_private.daily_assignments a where a.user_id=u and a.challenge_id=c.challenge_id),date '1900-01-01'),md5(u::text||d::text||c.challenge_id::text) limit 1;
  if chosen is not null then insert into hub_private.daily_assignments values(u,d,chosen,s); end if;
 end loop;
 select coalesce(sum(c.points_awarded),0)::integer into used from public.player_challenge_completions c join public.performance_challenges pc on pc.id=c.challenge_id where c.user_id=u and pc.cadence='daily' and c.period_key>=date_trunc('week',d::timestamp)::date and c.period_key<=d;
 select coalesce(jsonb_agg(to_jsonb(pc)||jsonb_build_object('slot',a.slot,'minutes',cat.minutes,'period_key',d,'completed',co.id is not null,'points_available',least(pc.points_awarded,greatest(0,12-used))) order by a.slot),'[]'::jsonb) into result
 from hub_private.daily_assignments a join public.performance_challenges pc on pc.id=a.challenge_id join hub_private.daily_catalog cat on cat.challenge_id=pc.id
 left join public.player_challenge_completions co on co.user_id=u and co.challenge_id=a.challenge_id and co.period_key=d
 where a.user_id=u and a.day=d;
 return jsonb_build_object('day',d,'timezone','Europe/London','weekly_remaining',greatest(0,12-used),'challenges',result);
end $$;
