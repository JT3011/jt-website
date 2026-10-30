-- Exercise the same server role used by Vercel, not the SQL editor's postgres role.
-- No account, membership, player record, or permission is modified by this test.
begin;
set local role service_role;
do $$
declare t text;
begin
 foreach t in array array['profiles','hub_staff','memberships','session_connect_coach_players','session_connect_parent_players','session_connect_coach_invites','session_connect_calendly_hosts','session_connect_sessions','session_connect_booking_queue','player_performance_accounts','hub_airtable_players','hub_player_airtable_links','hub_player_programmes','hub_provider_connections','hub_store_reward_settings','hub_store_reward_claims','hub_coach_calendar_cache'] loop
   assert has_table_privilege(current_user,'public.'||t,'SELECT'),'Server cannot read '||t;
   execute format('select 1 from public.%I limit 1',t);
 end loop;
 foreach t in array array['hub_staff','session_connect_coach_players','session_connect_parent_players','session_connect_coach_invites','session_connect_calendly_hosts'] loop
   assert has_table_privilege(current_user,'public.'||t,'INSERT'),'Server cannot insert '||t;
   assert has_table_privilege(current_user,'public.'||t,'UPDATE'),'Server cannot update '||t;
 end loop;
end $$;
reset role;
do $$begin
 assert not has_table_privilege('authenticated','public.hub_staff','SELECT'),'Browser cannot list staff roles directly';
 assert not has_table_privilege('authenticated','public.hub_staff','UPDATE'),'Browser cannot promote itself';
 assert not has_table_privilege('anon','public.hub_staff','SELECT'),'Anonymous cannot see staff roles';
 assert not has_table_privilege('authenticated','public.hub_provider_connections','SELECT'),'Provider credentials remain private';
 assert not has_table_privilege('authenticated','public.hub_coach_calendar_cache','SELECT'),'Calendar cache remains private';
end $$;
select 'Server access checks passed; browser restrictions retained.' as result;
rollback;
