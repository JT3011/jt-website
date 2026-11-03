-- Session credit data is private to the owner. Provider sync remains service-only.
-- Apply using the native migration API; no account IDs or credentials are embedded.
alter policy portal_credit_read on public.hub_airtable_players
  using ((select private.jt_ops_is_owner()));
alter policy portal_link_read on public.hub_player_airtable_links
  using ((select private.jt_ops_is_owner()));

-- Restrictive guards keep later permissive policies from reopening these tables.
create policy portal_credit_owner_guard on public.hub_airtable_players
  as restrictive for select to authenticated
  using ((select private.jt_ops_is_owner()));
create policy portal_credit_link_owner_guard on public.hub_player_airtable_links
  as restrictive for select to authenticated
  using ((select private.jt_ops_is_owner()));
