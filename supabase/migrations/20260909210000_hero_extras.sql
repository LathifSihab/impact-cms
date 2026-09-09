-- The homepage hero carries more than a headline.
--
-- site/index.html has a trust list ("8–25 jaar · Zes fundamenten · Sinds 2026 in
-- Antwerpen") and two calls to action under the standfirst. Those are hero
-- furniture, not a section: they sit inside <header class="hero"> and disappear
-- with it. Columns rather than a section keeps them attached to the hero they
-- belong to.
--
-- Every page can use them; only the homepage does today.

alter table pages
  add column hero_trust jsonb not null default '[]'::jsonb,
  add column hero_cta_label text not null default '',
  add column hero_cta_href text not null default '',
  add column hero_cta2_label text not null default '',
  add column hero_cta2_href text not null default '';

comment on column pages.hero_trust is
  'Short reassurance items shown as a list under the headline.';
