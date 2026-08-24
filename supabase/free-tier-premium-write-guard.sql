-- JT Performance Hub free-tier hardening
-- Applied to Supabase project hunrekcnmtabowiivmrk on 2026-08-24.
-- Free authenticated players can keep using Challenges, their Player Profile,
-- and authorised Session Connect feedback. Premium-only write surfaces require
-- a trialing/active membership. JT staff remain allowed.

create or replace function public.enforce_performance_hub_premium_write()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_code text := case
    when tg_op in ('INSERT','UPDATE') then to_jsonb(new)->>'item_code'
    else null
  end;
begin
  -- Server-side/service operations may not carry an end-user JWT.
  -- RLS still governs direct public Data API access.
  if v_user_id is null then
    return new;
  end if;

  if public.is_hub_staff(v_user_id) then
    return new;
  end if;

  if exists (
    select 1
    from public.memberships m
    where m.user_id = v_user_id
      and m.subscription_status in ('trialing','active')
  ) then
    return new;
  end if;

  -- Free accounts may receive the default avatar records created by
  -- initialise_my_performance_profile(), but cannot equip Premium items.
  if tg_table_name = 'player_avatar_equipment'
     and tg_op = 'INSERT'
     and exists (
       select 1
       from public.avatar_items ai
       where ai.item_code = v_item_code
         and ai.is_default = true
         and ai.is_active = true
     ) then
    return new;
  end if;

  if tg_table_name = 'player_avatar_unlocks'
     and tg_op = 'INSERT'
     and coalesce(to_jsonb(new)->>'unlock_source','') = 'default'
     and exists (
       select 1
       from public.avatar_items ai
       where ai.item_code = v_item_code
         and ai.is_default = true
         and ai.is_active = true
     ) then
    return new;
  end if;

  raise exception 'JT Performance Hub Premium is required for this feature.'
    using errcode = '42501';
end;
$$;

revoke all on function public.enforce_performance_hub_premium_write()
from public, anon, authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array[
    'player_progress',
    'player_nutrition_plates',
    'daily_readiness_checkins',
    'matchday_reflections',
    'global_reward_claims',
    'physical_reward_claims',
    'player_avatar_equipment',
    'player_avatar_unlocks'
  ] loop
    execute format(
      'drop trigger if exists enforce_premium_hub_write on public.%I',
      t
    );

    execute format(
      'create trigger enforce_premium_hub_write before insert or update on public.%I for each row execute function public.enforce_performance_hub_premium_write()',
      t
    );
  end loop;
end;
$$;
