begin;
do $$
begin
 if not (select relrowsecurity from pg_class where oid='public.hub_nutrition_quotes'::regclass) then raise exception 'RLS must be enabled'; end if;
 if has_table_privilege('anon','public.hub_nutrition_quotes','SELECT') or has_table_privilege('authenticated','public.hub_nutrition_quotes','SELECT') then raise exception 'Clients must not read the pricing table directly'; end if;
 if has_table_privilege('anon','public.hub_nutrition_quotes','INSERT') or has_table_privilege('authenticated','public.hub_nutrition_quotes','UPDATE') then raise exception 'Clients must not write the pricing table directly'; end if;
 if not has_table_privilege('service_role','public.hub_nutrition_quotes','SELECT,INSERT,UPDATE') then raise exception 'Server access missing'; end if;
end $$;
set local role service_role;
insert into public.hub_nutrition_quotes (client_email,client_name,amount_pence,billing,description)
values ('rollback-only-quote@example.invalid','Rollback-only quote',6500,'one_off','Synthetic test, always rolled back');
do $$
declare changed integer;
begin
 update public.hub_nutrition_quotes set amount_pence=8000,revision=2 where client_email='rollback-only-quote@example.invalid' and revision=1;
 get diagnostics changed = row_count;
 if changed<>1 then raise exception 'The guarded update did not succeed'; end if;
 update public.hub_nutrition_quotes set amount_pence=9000 where client_email='rollback-only-quote@example.invalid' and revision=1;
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'A stale revision overwrote the current price'; end if;
end $$;
reset role;
set local role authenticated;
do $$
begin
 begin
  perform 1 from public.hub_nutrition_quotes;
  raise exception 'Authenticated browser unexpectedly read prices';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.hub_nutrition_quotes set amount_pence=1;
  raise exception 'Authenticated browser unexpectedly changed prices';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
