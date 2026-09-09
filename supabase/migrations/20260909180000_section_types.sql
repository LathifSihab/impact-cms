-- Two more section types.
--
-- `downloads` is the numbered file list on /media — rows that link to a file, or
-- sit greyed out with "Volgt" when there is nothing to link to yet. The site
-- shows those rather than hiding them, so the list reads as a plan rather than a
-- gap, and the type keeps that behaviour.
--
-- `split_list` is the two-column tick comparison on /hosted-experiences: what
-- the host brings against what IMPACT brings.
--
-- Both were previously reported as unrecognised by the seed and left as static
-- markup. They are the last two blocks on the configurable pages that a person
-- could not edit.

alter table page_sections drop constraint page_sections_type_check;

alter table page_sections add constraint page_sections_type_check
  check (type in (
    'sec_head', 'rich_text', 'media_text', 'collection',
    'cta_cards', 'band', 'news_band',
    'downloads', 'split_list'
  ));
