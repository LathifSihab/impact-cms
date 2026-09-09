-- The Media page's three bespoke blocks.
--
-- `cine` is the full-bleed showcase video with its glass overlay; `vcards` is
-- the grid of participant clips, which is consent-gated exactly like the
-- homepage reel because it shows the same minors; `mosaic` is the photo
-- archive that lightbox.js opens.
alter table public.page_sections drop constraint if exists page_sections_type_check;
alter table public.page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list', 'numbered_list', 'reel',
    'founders', 'team', 'form',
    'cine', 'vcards', 'mosaic'
  ));
