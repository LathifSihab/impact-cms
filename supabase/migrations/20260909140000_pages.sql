-- Page configuration: the eight prose pages, and the ordered sections in them.
--
-- Why two tables rather than one row of fields per page:
--
-- The pages do not share a body. over.html has founders and a methodology
-- diagram, samenwerken.html has tiers and a partner wall, contact.html is a
-- form. A fixed column set would either be the union of every page's needs —
-- mostly null on every row — or a code change every time a section is added.
--
-- Why typed sections rather than a free-form block builder:
--
-- Most of the body is already modelled. Foundations, formats, age groups,
-- tiers, partners, figures and experts are content types with their own
-- screens, and a generic block builder would invite someone to retype them as
-- loose text. The `collection` section type points at those instead, so a page
-- composes existing content rather than duplicating it.
--
-- `content` is jsonb because each section type has its own shape, the payload is
-- always read and written whole, and it belongs to exactly one section. Same
-- reasoning as gallery and programme_days on events.

create table pages (
  id          text primary key,          -- slug: 'home', 'over', 'contact'
  locale      text not null default 'nl' check (locale in ('nl','en')),
  nav_label   text not null,             -- how it is listed in the backoffice
  sort_order  int  not null default 0,

  -- The hero is the one part every page genuinely shares, so it is columns
  -- rather than a section: label, headline, standfirst, image.
  hero_label  text not null default '',
  hero_title  text not null default '',
  hero_intro  text not null default '',
  hero_image  text,
  hero_variant text not null default 'page'
    check (hero_variant in ('home','page','overlaid','event')),

  seo         jsonb not null default '{"title":"","description":""}'::jsonb,

  -- Unpublished pages are editable but must not render. This is not a consent
  -- gate — no personal data here — it is a draft flag.
  published   boolean not null default true,

  updated_at  timestamptz not null default now()
);

create index pages_order_idx on pages (sort_order, id);

create table page_sections (
  id         uuid primary key default gen_random_uuid(),
  page_id    text not null references pages(id) on delete cascade,
  position   int  not null default 0,
  type       text not null check (type in (
               'sec_head', 'rich_text', 'media_text', 'collection',
               'cta_cards', 'band', 'news_band'
             )),
  -- Background the section sits on, matching .section / --sand / --black.
  ground     text not null default 'white' check (ground in ('white','sand','black')),
  -- Anchor for in-page links, e.g. #fundamenten. Optional.
  anchor     text,
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index page_sections_page_idx on page_sections (page_id, position);

do $t$
declare t text;
begin
  foreach t in array array['pages','page_sections'] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $t$;

-- ---- access -----------------------------------------------------------------
-- Staff write; anonymous visitors read published pages only. Same shape as the
-- rest: GRANT decides who may touch the table, the policy decides which rows.

grant select, insert, update, delete on pages to authenticated;
grant select, insert, update, delete on page_sections to authenticated;
grant all on pages to service_role;
grant all on page_sections to service_role;
grant select on pages to anon;
grant select on page_sections to anon;

alter table pages enable row level security;
alter table page_sections enable row level security;

create policy pages_select_staff on pages for select to authenticated using (true);
create policy pages_insert_staff on pages for insert to authenticated with check (true);
create policy pages_update_staff on pages for update to authenticated using (true) with check (true);
create policy pages_delete_staff on pages for delete to authenticated using (true);

create policy sections_select_staff on page_sections for select to authenticated using (true);
create policy sections_insert_staff on page_sections for insert to authenticated with check (true);
create policy sections_update_staff on page_sections for update to authenticated using (true) with check (true);
create policy sections_delete_staff on page_sections for delete to authenticated using (true);

-- A draft page is invisible to visitors, and so are its sections.
create policy pages_select_public on pages
  for select to anon using (published = true);

create policy sections_select_public on page_sections
  for select to anon using (
    exists (select 1 from pages p where p.id = page_sections.page_id and p.published)
  );
