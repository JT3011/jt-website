-- JT coaching portal. Run once using the migration API; no client secrets or user IDs.
create schema if not exists private;

create or replace function private.hub_portal_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.hub_staff where user_id = auth.uid() and role in ('owner','admin')
  );
$$;
create or replace function private.hub_portal_edit(player uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.hub_portal_manager() or exists (
    select 1 from public.session_connect_coach_players cp
    join public.hub_staff hs on hs.user_id = cp.coach_user_id
    where cp.coach_user_id = auth.uid() and cp.player_user_id = player and cp.active
      and hs.role = 'coach'
  ));
$$;
create or replace function private.hub_portal_view(player uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (auth.uid() = player or private.hub_portal_edit(player) or exists (
    select 1 from public.session_connect_parent_players
    where parent_user_id = auth.uid() and player_user_id = player and active
  ));
$$;
revoke all on function private.hub_portal_manager(), private.hub_portal_edit(uuid), private.hub_portal_view(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.hub_portal_manager(), private.hub_portal_edit(uuid), private.hub_portal_view(uuid) to authenticated;

create table public.hub_airtable_players (
  airtable_record_id text primary key check (airtable_record_id ~ '^rec[A-Za-z0-9]{14}$'),
  display_name text not null,
  credits jsonb not null default '[]'::jsonb check (jsonb_typeof(credits) = 'array'),
  synced_at timestamptz not null default now()
);
create table public.hub_player_airtable_links (
  player_user_id uuid primary key references public.profiles(id) on delete cascade,
  airtable_record_id text unique not null references public.hub_airtable_players(airtable_record_id),
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now()
);
create table public.hub_player_programmes (
  id uuid primary key default gen_random_uuid(),
  player_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('gym','nutrition')),
  title text not null check (length(trim(title)) between 1 and 150),
  goal text not null default '' check (length(goal) <= 1000),
  content text not null check (length(trim(content)) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft','published')),
  starts_on date,
  review_on date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(player_user_id,kind),
  check (review_on is null or starts_on is null or review_on >= starts_on)
);
create index hub_player_programmes_updated_by_idx on public.hub_player_programmes(updated_by);
create index hub_player_airtable_links_linked_by_idx on public.hub_player_airtable_links(linked_by);
alter table public.hub_airtable_players enable row level security;
alter table public.hub_player_airtable_links enable row level security;
alter table public.hub_player_programmes enable row level security;
revoke all on public.hub_airtable_players, public.hub_player_airtable_links, public.hub_player_programmes from anon, authenticated;
grant select on public.hub_airtable_players, public.hub_player_airtable_links to authenticated;
grant select, insert, update on public.hub_player_programmes to authenticated;
grant all on public.hub_airtable_players, public.hub_player_airtable_links, public.hub_player_programmes to service_role;

create policy portal_link_read on public.hub_player_airtable_links for select to authenticated
using (private.hub_portal_view(player_user_id));
create policy portal_credit_read on public.hub_airtable_players for select to authenticated using (
  (select private.hub_portal_manager()) or exists (
    select 1 from public.hub_player_airtable_links l
    where l.airtable_record_id = hub_airtable_players.airtable_record_id
      and private.hub_portal_view(l.player_user_id)
  )
);
create policy portal_programme_read on public.hub_player_programmes for select to authenticated
using (private.hub_portal_edit(player_user_id) or (status = 'published' and private.hub_portal_view(player_user_id)));
create policy portal_programme_insert on public.hub_player_programmes for insert to authenticated
with check (private.hub_portal_edit(player_user_id));
create policy portal_programme_update on public.hub_player_programmes for update to authenticated
using (private.hub_portal_edit(player_user_id)) with check (private.hub_portal_edit(player_user_id));

create or replace function private.hub_programme_stamp()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.player_user_id <> old.player_user_id or new.kind <> old.kind) then
    raise exception 'Programme ownership cannot be changed';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function private.hub_programme_stamp() from public, anon, authenticated;
create trigger hub_programme_stamp before insert or update on public.hub_player_programmes
for each row execute function private.hub_programme_stamp();

-- Staff invitation activation must wait for email ownership verification.
create or replace function public.session_connect_accept_coach_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_invite public.session_connect_coach_invites%rowtype;
begin
  if new.email is null or new.email_confirmed_at is null then return new; end if;
  select * into v_invite from public.session_connect_coach_invites
    where email = lower(trim(new.email)) and active and accepted_user_id is null for update;
  if not found then return new; end if;
  insert into public.hub_staff(user_id,role) values(new.id,v_invite.role)
    on conflict(user_id) do update set role = excluded.role;
  update public.session_connect_calendly_hosts set coach_user_id = new.id, updated_at = now()
    where lower(calendly_email) = lower(trim(new.email))
      or (v_invite.calendly_user_uri is not null and calendly_user_uri = v_invite.calendly_user_uri);
  update public.session_connect_coach_invites set active = false, accepted_user_id = new.id,
    accepted_at = now(), updated_at = now() where email = v_invite.email;
  return new;
end;
$$;
revoke all on function public.session_connect_accept_coach_invite() from public, anon, authenticated;
drop trigger session_connect_accept_coach_invite_trigger on auth.users;
create trigger session_connect_accept_coach_invite_trigger after insert or update of email,email_confirmed_at
on auth.users for each row execute function public.session_connect_accept_coach_invite();
