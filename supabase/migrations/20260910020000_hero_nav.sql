-- The in-page anchor nav and the overlay meta blocks that sit in some heroes.
--
-- Four pages carry an anchor nav (Over, Events, Media, Samenwerken); only Over
-- carries the overlay meta. Both are lists of small records rather than free
-- text, because the nav's links have to stay in step with the sections below.
alter table public.pages
  add column if not exists hero_anchor_nav   jsonb not null default '[]'::jsonb,
  add column if not exists hero_overlay_meta jsonb not null default '[]'::jsonb;

comment on column public.pages.hero_anchor_nav is
  'Rows of {label, href} rendered as nav.anchor-nav in the hero.';
comment on column public.pages.hero_overlay_meta is
  'Rows of {heading, body} rendered as .overlay-meta items in the hero.';
