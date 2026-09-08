-- Anonymous read access for the public site.
--
-- The CMS now renders /events and /journal itself, so the anon role needs to
-- read content. The previous migration gave it nothing, and its comment said
-- what to do when this day came:
--
--   "add a *narrow* anon select policy per table that filters on the consent
--    flag, rather than widening this."
--
-- So that is what this is. Three tables are filtered on their consent flag and
-- can never serve an unapproved row to a visitor, no matter what the page asks
-- for. The filter lives here rather than in a query, because a query can be
-- written wrongly and a policy cannot be forgotten.
--
-- anon gets SELECT and nothing else. Every write still requires a signed-in
-- member of staff.

grant usage on schema public to anon;

-- ---- unrestricted reads: no personal data, nothing gated ---------------------
-- Events, journal and the taxonomy tables are the site's public content. Events
-- carry no consent flag: a 'past' or 'full' edition is still shown, which is why
-- status is a display concern and not a visibility one.
do $pub$
declare t text;
begin
  foreach t in array array[
    'events','journal','formats','foundations','age_groups','tiers','partners',
    'events_foundations','events_experts','events_partners'
  ] loop
    execute format('grant select on %I to anon', t);
    execute format(
      'create policy %I on %I for select to anon using (true)',
      t || '_select_public', t);
  end loop;
end $pub$;

-- ---- gated reads: the consent flag is the policy -----------------------------
-- experts are real named people, figures are public claims about outcomes, and
-- testimonials quote parents. Each publishes only once a human has ticked the
-- box. Enforced in the database so a page cannot leak one by omitting a filter.

grant select on experts to anon;
create policy experts_select_public on experts
  for select to anon using (confirmed = true);

grant select on figures to anon;
create policy figures_select_public on figures
  for select to anon using (confirmed = true);

grant select on testimonials to anon;
create policy testimonials_select_public on testimonials
  for select to anon using (consent_on_file = true);
