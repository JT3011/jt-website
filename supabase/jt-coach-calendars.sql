-- Calendar identities are separate from logins: JT can see pending coaches without
-- granting them access, and Billy's JT-hosted booking page stays separate from JT.
begin;
create table public.hub_coach_calendars (
 id text primary key check(id ~ '^[a-z][a-z0-9_-]{0,39}$'),
 display_name text not null,
 booking_url text not null check(booking_url ~ '^https://calendly[.]com/'),
 calendly_host_uri text references public.session_connect_calendly_hosts(calendly_user_uri),
 host_default boolean not null default false,
 account_email text unique check(account_email=lower(trim(account_email))),
 coach_user_id uuid unique references auth.users(id) on delete set null,
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create unique index hub_coach_calendar_host_default on public.hub_coach_calendars(calendly_host_uri) where host_default and enabled;
create index hub_coach_calendar_host on public.hub_coach_calendars(calendly_host_uri);
alter table public.hub_coach_calendars enable row level security;
revoke all on public.hub_coach_calendars from anon,authenticated;
grant select,insert,update on public.hub_coach_calendars to service_role;
alter table public.hub_calendly_coach_rules add column calendar_id text references public.hub_coach_calendars(id);
create index hub_coach_rules_calendar on public.hub_calendly_coach_rules(calendar_id);
alter table public.session_connect_booking_queue add column calendar_id text references public.hub_coach_calendars(id);
create index hub_booking_queue_calendar_start on public.session_connect_booking_queue(calendar_id,start_at);
alter table public.hub_coach_calendar_cache add column scope text not null default '28d';

insert into public.hub_coach_calendars(id,display_name,booking_url,calendly_host_uri,host_default,account_email) values
 ('jt','James Taylor · CEO','https://calendly.com/jt-mind-body-balance/1-1-football-session-with-jt','https://api.calendly.com/users/603861c2-aae4-483c-917b-5d6b850bbfb7',true,'james@jtmindbodybalance.com'),
 ('george','George Bellis','https://calendly.com/george-jtmindbodybalance/football','https://api.calendly.com/users/64c0a9b7-9c5b-48a0-ad38-1a4cd9e157d7',true,'george@jtmindbodybalance.com'),
 ('charlie','Charlie Rogers','https://calendly.com/charlie-jtmindbodybalance/1-1-football-session-with-charlie','https://api.calendly.com/users/9c10e639-bdff-49bb-9077-79bc07c4d2d4',true,'charlie@jtmindbodybalance.com'),
 ('billy','Billy','https://calendly.com/jt-mind-body-balance/1-1-football-sessions','https://api.calendly.com/users/603861c2-aae4-483c-917b-5d6b850bbfb7',false,null);
insert into public.hub_calendly_coach_rules(event_name,calendar_id,display_name)
 select n.event_name,c.id,c.display_name from (values
 ('jt','1:1 Football Session with JT'),('jt','1:1 Gym Session'),('jt','JT Group Session'),('jt','Performance Consultation (Free)'),
 ('george','1:1 Football Session with George'),('george','1:1 Gym Session with George'),('george','Football Session with George'),
 ('charlie','1:1 Football Session with Charlie'),('charlie','Football Session with Charlie'),('charlie','1:1 Football Session with Charlie — Berkeley Fridays'),
 ('billy','1:1 Football Session with Billy — Berkeley')) n(calendar_id,event_name)
 join public.hub_coach_calendars c on c.id=n.calendar_id
 on conflict(event_name) do update set calendar_id=excluded.calendar_id,display_name=excluded.display_name;

create or replace function private.hub_bind_coach_calendar(p_user uuid) returns void
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_email text;
begin
 select lower(trim(u.email)) into v_email from auth.users u join public.hub_staff s on s.user_id=u.id
   where u.id=p_user and s.role in ('owner','admin','coach') and u.email_confirmed_at is not null
   and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<now());
 if v_email is null then return; end if;
 update public.hub_coach_calendars set coach_user_id=p_user,updated_at=now()
   where account_email=v_email and enabled and (coach_user_id is null or coach_user_id=p_user);
 update public.hub_calendly_coach_rules r set coach_user_id=c.coach_user_id,updated_at=now()
   from public.hub_coach_calendars c where r.calendar_id=c.id and c.coach_user_id=p_user;
 update public.session_connect_calendly_hosts h set coach_user_id=p_user,updated_at=now()
   from public.hub_coach_calendars c where c.coach_user_id=p_user and c.host_default and c.calendly_host_uri=h.calendly_user_uri;
 -- Do not alter completed history or JT's explicit per-booking assignment.
 update public.session_connect_booking_queue q set updated_at=now()
   where converted_session_id is null and q.calendar_id in(select id from public.hub_coach_calendars where coach_user_id=p_user);
end $$;
revoke all on function private.hub_bind_coach_calendar(uuid) from public,anon,authenticated;

create or replace function private.hub_coach_calendar_on_verified_login() returns trigger
language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 if new.email_confirmed_at is not null then perform private.hub_bind_coach_calendar(new.id); end if;
 return new;
end $$;
revoke all on function private.hub_coach_calendar_on_verified_login() from public,anon,authenticated;
create trigger z_hub_coach_calendar_verified after insert or update of email,email_confirmed_at on auth.users
 for each row execute function private.hub_coach_calendar_on_verified_login();

create or replace function public.hub_set_coach_calendar_email(p_calendar text,p_email text) returns jsonb
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare c public.hub_coach_calendars%rowtype; v_email text:=lower(trim(p_email)); v_user uuid;
begin
 if not exists(select 1 from public.hub_staff where user_id=auth.uid() and role='owner') then raise exception 'Only the CEO can assign coach logins'; end if;
 if v_email is null or length(v_email)>254 or v_email!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid coach email'; end if;
 select * into c from public.hub_coach_calendars where id=p_calendar and enabled for update;
 if not found then raise exception 'Coach calendar not found'; end if;
 if c.coach_user_id is not null and c.account_email is distinct from v_email then raise exception 'This calendar already has a coach login'; end if;
 if exists(select 1 from public.hub_coach_calendars where account_email=v_email and id<>c.id) then raise exception 'This email already belongs to another coach calendar'; end if;
 update public.hub_coach_calendars set account_email=v_email,updated_at=now() where id=c.id;
 select id into v_user from auth.users where lower(trim(email))=v_email and email_confirmed_at is not null
   and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<now());
 if v_user is null then
   -- Approval is activated only after the coach verifies ownership of this email.
   -- No invitation email is sent and a shared host URI is never assigned to Billy.
   insert into public.session_connect_coach_invites(email,display_name,role,active,calendly_user_uri)
     values(v_email,c.display_name,'coach',true,case when c.host_default then c.calendly_host_uri else null end)
     on conflict(email) do update set display_name=excluded.display_name,active=true,accepted_user_id=null,accepted_at=null,calendly_user_uri=excluded.calendly_user_uri;
 else
   insert into public.hub_staff(user_id,role) values(v_user,'coach') on conflict(user_id) do nothing;
   perform private.hub_bind_coach_calendar(v_user);
 end if;
 return jsonb_build_object('connected',v_user is not null,'email',v_email);
end $$;
revoke all on function public.hub_set_coach_calendar_email(text,text) from public,anon;
grant execute on function public.hub_set_coach_calendar_email(text,text) to authenticated;

create or replace function private.hub_match_booking() returns trigger
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_player uuid; v_coach uuid; v_session uuid; v_status text; v_name text; prior public.session_connect_booking_queue%rowtype;
begin
  if tg_op='INSERT' then
    select * into prior from public.session_connect_booking_queue where external_booking_id=new.external_booking_id;
    if found then
      if prior.source_updated_at is not null and new.source_updated_at<prior.source_updated_at then return prior; end if;
      new.converted_session_id:=prior.converted_session_id; new.calendar_id:=prior.calendar_id;
      if prior.converted_session_id is not null then new.player_user_id:=prior.player_user_id; new.coach_user_id:=prior.coach_user_id; end if;
    end if;
  end if;
  if tg_op='UPDATE' and old.source_updated_at is not null and new.source_updated_at<old.source_updated_at then return old; end if;
  -- Keep the explicit link selected by JT; only the booking details may change.
  if tg_op='UPDATE' and old.converted_session_id is not null then
    new.player_user_id:=old.player_user_id; new.coach_user_id:=old.coach_user_id;
    new.converted_session_id:=old.converted_session_id; new.calendar_id:=old.calendar_id;
  end if;
  if new.converted_session_id is not null then
    if new.calendar_id is null or (tg_op='UPDATE' and old.converted_session_id is null) then
      select id into new.calendar_id from public.hub_coach_calendars where coach_user_id=new.coach_user_id and enabled;
    end if;
    update public.session_connect_sessions set start_at=new.start_at,end_at=new.end_at,venue=new.venue,
      status=case when status in ('completed','no_show') then status
        when new.booking_status='canceled' then 'cancelled' when status='in_progress' then status else 'scheduled' end
      where id=new.converted_session_id;
    return new;
  end if;
  select r.coach_user_id,r.calendar_id into v_coach,new.calendar_id from public.hub_calendly_coach_rules r where r.event_name=new.event_name;
  if not found then
    select id into new.calendar_id from public.hub_coach_calendars where calendly_host_uri=new.coach_calendly_user_uri and host_default and enabled;
    select h.coach_user_id into v_coach from public.session_connect_calendly_hosts h
      where h.calendly_user_uri=new.coach_calendly_user_uri and h.enabled;
    -- Unknown named delivery coaches require review, even if JT hosts the booking.
    v_name:=lower(substring(new.event_name from '(?i)with ([A-Za-z]+)'));
    if v_name is not null and not exists(select 1 from auth.users u where u.id=v_coach
      and (lower(split_part(u.email,'@',1))=v_name or (v_name='jt' and exists(select 1 from public.hub_staff s where s.user_id=u.id and s.role='owner')))) then v_coach:=null; new.calendar_id:=null; end if;
  end if;
  if not exists(select 1 from public.hub_staff s where s.user_id=v_coach and s.role in ('owner','admin','coach')) then v_coach:=null; end if;
  v_player:=public.session_connect_resolve_booking_player(new.invitee_email,new.invitee_phone);
  new.coach_user_id:=v_coach; new.player_user_id:=v_player;
  if v_player is null or v_coach is null then
    new.issue_code:=case when v_coach is null then 'coach_not_linked' else 'player_not_linked' end;
    new.issue_detail:=case when v_coach is null then 'Choose the delivering coach.' else 'Choose a player. Shared or conflicting emails need review.' end;
    return new;
  end if;
  if new.booking_status='active' then
    insert into public.session_connect_coach_players(coach_user_id,player_user_id,active)
      values(v_coach,v_player,true) on conflict(coach_user_id,player_user_id) do update set active=true;
  end if;
  insert into public.session_connect_sessions(player_user_id,coach_user_id,start_at,end_at,session_type,venue,status,source,external_booking_id,external_event_uri,external_invitee_uri,booking_email,booking_name)
    values(v_player,v_coach,new.start_at,new.end_at,new.event_name,new.venue,case when new.booking_status='canceled' then 'cancelled' else 'scheduled' end,'calendly',new.external_booking_id,new.external_event_uri,new.external_invitee_uri,new.invitee_email,new.invitee_name)
    on conflict(source,external_booking_id) where external_booking_id is not null do update set
      start_at=excluded.start_at,end_at=excluded.end_at,venue=excluded.venue,
      status=case when session_connect_sessions.status in ('completed','no_show') then session_connect_sessions.status else excluded.status end
    returning id into v_session;
  new.converted_session_id:=v_session; new.issue_code:=null; new.issue_detail:=null;
  return new;
end $$;


-- Bind existing verified coaches, classify imported bookings and approve Charlie's
-- verified Calendly email for his future Hub sign-up. Billy's email remains unset.
select private.hub_bind_coach_calendar(user_id) from public.hub_staff;
update public.session_connect_booking_queue set updated_at=now() where start_at>=date_trunc('day',now());
insert into public.session_connect_coach_invites(email,display_name,role,active,calendly_user_uri)
 values('charlie@jtmindbodybalance.com','Charlie Rogers','coach',true,'https://api.calendly.com/users/9c10e639-bdff-49bb-9077-79bc07c4d2d4')
 on conflict(email) do nothing;
commit;
