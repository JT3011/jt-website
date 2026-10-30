-- Planning identity is independent from login identity. Name matches never grant family access.
alter table public.hub_session_plans
  add column booking_id uuid unique references public.session_connect_booking_queue(id) on delete cascade,
  add column player_name text not null default '',
  add column airtable_record_id text,
  add column match_note text not null default '',
  add column planning_ready boolean not null default false,
  add column plan_sheet jsonb;
alter table public.hub_session_plans add constraint plan_sheet_size check(plan_sheet is null or octet_length(plan_sheet::text)<=90000);
create table public.hub_apex_context (
  id text primary key,
  player_name text not null,
  aliases jsonb not null default '[]',
  context jsonb not null default '{}',
  checked_at timestamptz not null default now()
);
alter table public.hub_apex_context enable row level security;
revoke all on public.hub_apex_context from public,anon,authenticated;
grant select,insert,update on public.hub_apex_context to service_role;

create or replace function private.hub_can_access_plan(p_id uuid,p_edit boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare p public.hub_session_plans; q public.session_connect_booking_queue; v_role text; v_coach uuid; v_player uuid;
begin
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now())) then return false; end if;
 select role into v_role from public.hub_staff where user_id=auth.uid();
 select * into p from public.hub_session_plans where id=p_id;
 if not found then return false; end if;
 if v_role='owner' then return true; end if;
 v_player:=p.player_user_id;
 if p.booking_id is not null then
   select * into q from public.session_connect_booking_queue where id=p.booking_id;
   if not found or q.calendar_id is distinct from p.calendar_id or (p.player_user_id is not null and q.player_user_id is not null and q.player_user_id<>p.player_user_id) then return false; end if;
   v_player:=coalesce(q.player_user_id,p.player_user_id);
   select coach_user_id into v_coach from public.hub_coach_calendars where id=q.calendar_id and enabled;
 elsif p.session_id is not null then
   return private.hub_plan_access(p.session_id,p.player_user_id,p.calendar_id,p_edit);
 elsif p.player_user_id is not null then
   return private.hub_plan_access(null,p.player_user_id,p.calendar_id,p_edit);
 elsif p.planning_ready then
   select coach_user_id into v_coach from public.hub_coach_calendars where id=p.calendar_id and enabled;
 else return false;
 end if;
 if v_role is not null then
   return coalesce(v_role in ('coach','admin') and v_coach=auth.uid() and (v_player is null or exists(select 1 from public.session_connect_coach_players where coach_user_id=auth.uid() and player_user_id=v_player and active)),false);
 end if;
 if p_edit or p.player_user_id is null then return false; end if;
 return auth.uid()=p.player_user_id or exists(select 1 from public.session_connect_parent_players where parent_user_id=auth.uid() and player_user_id=p.player_user_id and active);
end;$$;
revoke all on function private.hub_can_access_plan(uuid,boolean) from public,anon,authenticated;
grant execute on function private.hub_can_access_plan(uuid,boolean) to authenticated,service_role;
alter policy "session plans private read" on public.hub_session_plans to authenticated
 using(private.hub_can_access_plan(id,true) or(status='published' and private.hub_can_access_plan(id,false)));

create or replace function public.hub_create_booking_plan(p_booking uuid,p_title text,p_objective text,p_content text,p_player_name text,p_airtable text,p_match_note text,p_sheet jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare q public.session_connect_booking_queue; v_coach uuid; v_id uuid; v_owner boolean;
begin
 v_owner:=private.hub_plan_access(null,null,null,true);
 select * into q from public.session_connect_booking_queue where id=p_booking for update;
 if not found then raise exception 'Choose a booking'; end if;
 select coach_user_id into v_coach from public.hub_coach_calendars where id=q.calendar_id and enabled;
 if not v_owner and not (exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now())) and exists(select 1 from public.hub_staff where user_id=auth.uid() and role in ('coach','admin')) and v_coach=auth.uid() and (q.player_user_id is null or exists(select 1 from public.session_connect_coach_players where coach_user_id=auth.uid() and player_user_id=q.player_user_id and active))) then raise exception 'Session plan access denied'; end if;
 if not v_owner and v_coach is null then raise exception 'Session plan access denied'; end if;
 if q.booking_status<>'active' then raise exception 'Choose an active session'; end if;
 select id into v_id from public.hub_session_plans where booking_id=q.id or (q.converted_session_id is not null and session_id=q.converted_session_id) limit 1;
 if found then
   if not private.hub_can_access_plan(v_id,true) then raise exception 'Session plan access denied'; end if;
   return v_id;
 end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 180 or length(btrim(coalesce(p_content,''))) not between 1 and 40000 or length(coalesce(p_objective,''))>2000 then raise exception 'Invalid session plan'; end if;
 insert into public.hub_session_plans(booking_id,session_id,player_user_id,calendar_id,session_date,booking_uri,title,objective,content,status,player_name,airtable_record_id,match_note,planning_ready,plan_sheet,source_name,updated_by)
 values(q.id,q.converted_session_id,q.player_user_id,q.calendar_id,(q.start_at at time zone 'Europe/London')::date,q.external_event_uri,btrim(p_title),coalesce(p_objective,''),btrim(p_content),'draft',left(coalesce(p_player_name,q.invitee_name),200),p_airtable,left(coalesce(p_match_note,''),2000),true,p_sheet,'Apex · coaching draft',auth.uid()) returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.hub_create_booking_plan(uuid,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.hub_create_booking_plan(uuid,text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.hub_save_session_plan(p_id uuid,p_session uuid,p_title text,p_objective text,p_content text,p_status text,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_plan public.hub_session_plans; v_session public.session_connect_sessions; v_id uuid;
begin
  if p_title is null or length(btrim(p_title)) not between 1 and 180 or p_content is null or length(btrim(p_content)) not between 1 and 40000 or length(coalesce(p_objective,''))>2000 or p_status is null or p_status not in('draft','published') then raise exception 'Invalid session plan'; end if;
  if p_id is not null then
    select * into v_plan from public.hub_session_plans where id=p_id for update;
    if not found or not private.hub_can_access_plan(v_plan.id,true) then raise exception 'Session plan access denied'; end if;
    if p_revision is distinct from v_plan.revision then raise exception 'Plan changed; reload before saving'; end if;
    if p_status='published' and v_plan.player_user_id is null then raise exception 'Connect the player before publishing'; end if;
    update public.hub_session_plans set title=btrim(p_title),objective=coalesce(p_objective,''),content=btrim(p_content),plan_sheet=case when content=btrim(p_content) then plan_sheet else null end,status=p_status,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
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

