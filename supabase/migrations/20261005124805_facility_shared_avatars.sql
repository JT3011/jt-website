-- Each person explicitly opts their existing private avatar into the facility crowd.
create table public.hub_avatar_sharing (
 user_id uuid primary key references auth.users(id) on delete cascade,
 shared_at timestamptz not null default now()
);
alter table public.hub_avatar_sharing enable row level security;
revoke all on public.hub_avatar_sharing from public,anon,authenticated;
grant select,delete on public.hub_avatar_sharing to authenticated;
grant insert(user_id) on public.hub_avatar_sharing to authenticated;
create policy "Read own avatar sharing" on public.hub_avatar_sharing for select to authenticated using ((select auth.uid())=user_id);
create policy "Share own saved model" on public.hub_avatar_sharing for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.player_avatar_models m where m.user_id=(select auth.uid())));
create policy "Stop sharing own avatar" on public.hub_avatar_sharing for delete to authenticated using ((select auth.uid())=user_id);
create function private.facility_shared_avatar_paths() returns table(storage_path text) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return query select m.storage_path from public.hub_avatar_sharing s join public.player_avatar_models m on m.user_id=s.user_id
 where s.user_id<>auth.uid() and split_part(m.storage_path,'/',1)=m.user_id::text and lower(right(m.storage_path,4))='.glb'
 order by random() limit 10;
end $$;
revoke all on function private.facility_shared_avatar_paths() from public,anon,authenticated;
grant execute on function private.facility_shared_avatar_paths() to authenticated;
create function public.hub_facility_crowd() returns table(storage_path text) language sql security invoker set search_path='' as $$ select * from private.facility_shared_avatar_paths(); $$;
revoke all on function public.hub_facility_crowd() from public,anon,authenticated;
grant execute on function public.hub_facility_crowd() to authenticated;
-- A precise read exception for opted-in current GLBs, never the rest of anyone's private files.
create function private.facility_avatar_is_shared(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from public.hub_avatar_sharing s join public.player_avatar_models m on m.user_id=s.user_id
  where m.storage_path=object_path and split_part(m.storage_path,'/',1)=m.user_id::text and lower(right(m.storage_path,4))='.glb'
 );
$$;
revoke all on function private.facility_avatar_is_shared(text) from public,anon,authenticated;
grant execute on function private.facility_avatar_is_shared(text) to authenticated;
create policy "Read opted in facility models only" on storage.objects for select to authenticated
 using (bucket_id='player-avatars' and private.facility_avatar_is_shared(name));
