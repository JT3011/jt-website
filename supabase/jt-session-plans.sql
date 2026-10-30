-- Session plans are separate from feedback: publishing a plan never completes a session.
create table public.hub_session_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique references public.session_connect_sessions(id) on delete cascade,
  player_user_id uuid references auth.users(id) on delete cascade,
  calendar_id text references public.hub_coach_calendars(id),
  session_date date not null,
  booking_uri text,
  title text not null check (length(title) between 1 and 180),
  objective text not null default '' check (length(objective)<=2000),
  content text not null check (length(content) between 1 and 40000),
  status text not null default 'draft' check(status in ('draft','published')),
  source_record_id text unique,
  source_name text not null default 'JT coaching team',
  source_hash text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index hub_session_plans_player_date on public.hub_session_plans(player_user_id,session_date desc);
create index hub_session_plans_calendar on public.hub_session_plans(calendar_id);
create index hub_session_plans_updated_by on public.hub_session_plans(updated_by);
alter table public.hub_session_plans enable row level security;
revoke all on public.hub_session_plans from public,anon,authenticated;
grant select on public.hub_session_plans to authenticated;
grant select,insert,update,delete on public.hub_session_plans to service_role;

-- Resolve live booking ownership on every read. The saved plan cannot grant access.
create or replace function private.hub_plan_access(p_session uuid,p_player uuid,p_calendar text,p_edit boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_role text; v_player uuid:=p_player; v_coach uuid;
begin
  if not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())) then return false; end if;
  select role into v_role from public.hub_staff where user_id=auth.uid();
  if v_role='owner' then return true; end if;
  if p_session is not null then
    select player_user_id,coach_user_id into v_player,v_coach from public.session_connect_sessions where id=p_session;
    if not found or (p_player is not null and v_player is distinct from p_player) then return false; end if;
  else
    select coach_user_id into v_coach from public.hub_coach_calendars where id=p_calendar and enabled;
  end if;
  if v_role is not null then
    return coalesce(v_role in ('coach','admin') and v_coach=auth.uid() and exists(select 1 from public.session_connect_coach_players cp where cp.coach_user_id=auth.uid() and cp.player_user_id=v_player and cp.active),false);
  end if;
  if p_edit or v_player is null then return false; end if;
  return auth.uid()=v_player or exists(select 1 from public.session_connect_parent_players pp where pp.parent_user_id=auth.uid() and pp.player_user_id=v_player and pp.active);
end;$$;
revoke all on function private.hub_plan_access(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function private.hub_plan_access(uuid,uuid,text,boolean) to authenticated,service_role;
create policy "session plans private read" on public.hub_session_plans for select to authenticated
using(private.hub_plan_access(session_id,player_user_id,calendar_id,true) or (status='published' and private.hub_plan_access(session_id,player_user_id,calendar_id,false)));

create or replace function public.hub_save_session_plan(p_id uuid,p_session uuid,p_title text,p_objective text,p_content text,p_status text,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_plan public.hub_session_plans; v_session public.session_connect_sessions; v_id uuid;
begin
  if p_title is null or length(btrim(p_title)) not between 1 and 180 or p_content is null or length(btrim(p_content)) not between 1 and 40000 or length(coalesce(p_objective,''))>2000 or p_status is null or p_status not in('draft','published') then raise exception 'Invalid session plan'; end if;
  if p_id is not null then
    select * into v_plan from public.hub_session_plans where id=p_id for update;
    if not found or not private.hub_plan_access(v_plan.session_id,v_plan.player_user_id,v_plan.calendar_id,true) then raise exception 'Session plan access denied'; end if;
    if p_revision is distinct from v_plan.revision then raise exception 'Plan changed; reload before saving'; end if;
    if p_status='published' and v_plan.player_user_id is null then raise exception 'Connect the player before publishing'; end if;
    update public.hub_session_plans set title=btrim(p_title),objective=coalesce(p_objective,''),content=btrim(p_content),status=p_status,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
    return p_id;
  end if;
  select * into v_session from public.session_connect_sessions where id=p_session;
  if not found or not private.hub_plan_access(p_session,null,null,true) then raise exception 'Session plan access denied'; end if;
  if v_session.status='cancelled' then raise exception 'Choose an active session'; end if;
  if exists(select 1 from public.hub_session_plans where session_id=p_session) then raise exception 'This session already has a plan'; end if;
  insert into public.hub_session_plans(session_id,player_user_id,calendar_id,session_date,booking_uri,title,objective,content,status,updated_by)
  values(p_session,v_session.player_user_id,(select id from public.hub_coach_calendars where coach_user_id=v_session.coach_user_id and enabled limit 1),(v_session.start_at at time zone 'Europe/London')::date,v_session.external_event_uri,btrim(p_title),coalesce(p_objective,''),btrim(p_content),p_status,auth.uid()) returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.hub_save_session_plan(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.hub_save_session_plan(uuid,uuid,text,text,text,text,integer) to authenticated;

-- Only JT may resolve an imported sheet with no verified player connection.
create or replace function public.hub_link_session_plan(p_id uuid,p_player uuid,p_calendar text,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_plan public.hub_session_plans;
begin
  if not private.hub_plan_access(null,null,null,true) then raise exception 'Only JT can connect imported plans'; end if;
  select * into v_plan from public.hub_session_plans where id=p_id for update;
  if not found or v_plan.session_id is not null then raise exception 'Choose an imported plan'; end if;
  if p_revision is distinct from v_plan.revision then raise exception 'Plan changed; reload before saving'; end if;
  if not exists(select 1 from public.profiles where id=p_player) or exists(select 1 from public.hub_staff where user_id=p_player) then raise exception 'Choose a player account'; end if;
  if not exists(select 1 from public.hub_coach_calendars where id=p_calendar and enabled) then raise exception 'Choose a coach calendar'; end if;
  update public.hub_session_plans set player_user_id=p_player,calendar_id=p_calendar,status='draft',revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  return p_id;
end;$$;
revoke all on function public.hub_link_session_plan(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.hub_link_session_plan(uuid,uuid,text,integer) to authenticated;
