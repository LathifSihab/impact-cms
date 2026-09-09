-- Let a page exist in both languages.
--
-- `pages` was created with `id` as the primary key while also carrying a
-- `locale` column, which cannot both be true: one row per slug means the
-- English version of /events has nowhere to live. The decision was one row per
-- language, the same shape events and journal already use, so the key has to be
-- the pair.
--
-- page_sections follows: a section belongs to a page *in a language*, so the
-- foreign key is the pair too. Without that, deleting the Dutch page would take
-- the English page's sections with it.

alter table page_sections drop constraint page_sections_page_id_fkey;

alter table pages drop constraint pages_pkey;
alter table pages add constraint pages_pkey primary key (id, locale);

alter table page_sections add column locale text not null default 'nl'
  check (locale in ('nl','en'));

alter table page_sections
  add constraint page_sections_page_fkey
  foreign key (page_id, locale) references pages(id, locale) on delete cascade;

drop index if exists page_sections_page_idx;
create index page_sections_page_idx on page_sections (page_id, locale, position);

-- The public read policy has to follow the pair as well, or an English section
-- would be visible whenever the Dutch page happened to be published.
drop policy if exists sections_select_public on page_sections;
create policy sections_select_public on page_sections
  for select to anon using (
    exists (
      select 1 from pages p
      where p.id = page_sections.page_id
        and p.locale = page_sections.locale
        and p.published
    )
  );
