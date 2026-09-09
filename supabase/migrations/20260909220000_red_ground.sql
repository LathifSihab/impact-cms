-- The homepage's foundations strip sits on red. The site has .section--red and
-- uses it exactly there, so the ground list has to allow it.

alter table page_sections drop constraint page_sections_ground_check;

alter table page_sections add constraint page_sections_ground_check
  check (ground in ('white', 'sand', 'black', 'red'));
