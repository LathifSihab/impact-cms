-- One more section type: the numbered blocks that appear twice on the site as
-- the routes on the homepage ("Vind meteen jouw volgende stap") and the layers
-- on Over ("Eén visie, vier lagen"). Same shape, different styling, so one type
-- with a style switch rather than two that would drift.

alter table page_sections drop constraint page_sections_type_check;

alter table page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list', 'numbered_list'
  ));
