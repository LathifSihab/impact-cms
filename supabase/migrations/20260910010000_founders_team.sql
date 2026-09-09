-- Two section types for the Over page's bespoke blocks.
--
-- `founders` is the pair of long portraits with a quote each, plus the shared
-- closing note. `team` is the core-team cards followed by the expert grid,
-- which still reads the experts table so the `confirmed` gate keeps applying.
alter table public.page_sections drop constraint if exists page_sections_type_check;
alter table public.page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list', 'numbered_list', 'reel',
    'founders', 'team'
  ));
