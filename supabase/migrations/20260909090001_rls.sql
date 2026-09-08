-- Row level security.
--
-- The rule is deliberately blunt: this is a backoffice for a two-founder
-- organisation, and every signed-in account is staff. There is no public signup
-- (disable it in Supabase Auth settings) — accounts are created by invite, so
-- "authenticated" is the same set of people as "may edit content".
--
-- What matters more than roles here is that `anon` gets nothing at all. The
-- tables hold named real people (experts) and unpublished claims (figures), and
-- an anon-readable content API would leak rows whose `confirmed` is still false
-- — which is precisely the thing those flags exist to prevent.
--
-- When the CMS eventually serves the public site, add a *narrow* anon select
-- policy per table that filters on the consent flag, rather than widening this.

-- Two separate mechanisms, and both are needed: GRANT decides who may touch the
-- table at all, RLS decides which rows. Skipping the grants gives "permission
-- denied for table" even for the service role.
grant usage on schema public to authenticated, service_role;
revoke usage on schema public from anon;

do $rls$
declare t text;
begin
  foreach t in array array[
    'formats','foundations','age_groups','tiers','experts','partners',
    'figures','events','journal','testimonials',
    'events_foundations','events_experts','events_partners'
  ] loop
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
    execute format('grant all on %I to service_role', t);

    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_select_staff', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (true)',
      t || '_insert_staff', t);
    execute format(
      'create policy %I on %I for update to authenticated using (true) with check (true)',
      t || '_update_staff', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (true)',
      t || '_delete_staff', t);
  end loop;
end $rls$;
