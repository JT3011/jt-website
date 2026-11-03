begin;
insert into public.hub_airtable_players(airtable_record_id,display_name,booking_names)
values('reclivename000001','Live Player Example',array['Parent (Live Player Example)']),
 ('reclivename000002','Player',array[]::text[]);
insert into public.hub_apex_context(id,player_name,aliases)
values('reclivename000001','Older Player Example','["Reviewed Parent Alias"]');
do $$declare r jsonb;begin
 r:=private.hub_booking_name_match('Parent (Live Player Example)');
 assert r->>'name'='Live Player Example' and r->>'airtable'='reclivename000001','Live names match without a saved Apex profile';
 r:=private.hub_booking_name_match('Reviewed Parent Alias');
 assert r->>'name'='Live Player Example','Reviewed parent aliases display the current Airtable name';
 assert private.hub_booking_name_match('Player')->>'method'='unmatched','Placeholder labels never become matches';
 assert private.hub_booking_name_match('Live Player')->>'method'='unmatched','Partial names never silently match';
 assert not has_function_privilege('authenticated','private.hub_booking_name_directory()','execute'),'Clients cannot read the matching directory';
end$$;
update public.hub_airtable_players set display_name='Live Player Example' where airtable_record_id='reclivename000002';
do $$begin
 assert private.hub_booking_name_match('Parent (Live Player Example)')->>'airtable'='reclivename000001','An explicit unique booking alias wins over an ambiguous child-only label';
 assert private.hub_booking_name_match('Live Player Example')->>'method'='ambiguous','A shared bare name still requires review';
end$$;
update public.hub_airtable_players set display_name='Another Player Example' where airtable_record_id='reclivename000002';
update public.hub_airtable_players set display_name='Updated Player Example',booking_names=array['Parent (Updated Player Example)'] where airtable_record_id='reclivename000001';
do $$begin
 assert private.hub_booking_name_match('Reviewed Parent Alias')->>'name'='Updated Player Example','Renamed Airtable records immediately update display names';
end$$;
insert into public.hub_airtable_players(airtable_record_id,display_name,booking_names)
 values('reclivename000003','Updated Player Example',array['Reviewed Parent Alias']);
do $$begin
 assert private.hub_booking_name_match('Reviewed Parent Alias')->>'method'='ambiguous','Duplicate current names require review';
end$$;
select 'Live names, preserved aliases, duplicate review and private directory passed.' as result;
rollback;
