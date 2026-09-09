-- The participant reel on the homepage.
--
-- Its clips show minors. 01-BRIEF.md records that written parental consent per
-- clip had not been provided, and instructs plainly: do not design a feature
-- that assumes they stay. So the section carries its own consent flag and
-- renders the heading with no clips at all until someone ticks it — the same
-- shape as `confirmed` on experts and `consent_on_file` on testimonials.

alter table page_sections drop constraint page_sections_type_check;

alter table page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list', 'numbered_list', 'reel'
  ));
