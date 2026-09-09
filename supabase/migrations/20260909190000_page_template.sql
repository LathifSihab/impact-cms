-- Mark a page as a template.
--
-- The event detail pages all share their chrome — "Wat is het", "Praktisch",
-- the waitlist card's copy, the contact band — but there is no single URL that
-- shows it: the copy belongs to /events/<any slug>. That is a page record whose
-- content is read by another route rather than served at its own address.
--
-- Without the flag it would be reachable at /event-detail and render as a
-- half-empty page, and it would sit in the backoffice list looking like a page
-- someone forgot to finish.

alter table pages add column is_template boolean not null default false;

comment on column pages.is_template is
  'Shared copy for a family of pages, read by a route rather than served at its own URL.';
