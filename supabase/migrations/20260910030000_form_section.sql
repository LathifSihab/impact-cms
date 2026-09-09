-- The contact and request forms as a section type.
alter table public.page_sections drop constraint if exists page_sections_type_check;
alter table public.page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list', 'numbered_list', 'reel',
    'founders', 'team', 'form'
  ));
