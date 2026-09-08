-- IMPACT CMS — content schema.
--
-- Derived field-for-field from reference/content.config.ts (the Zod schemas that
-- validate the real content), not from the HTML. See 03-DATA-MODEL.md.
--
-- Two deliberate shapes, both argued in that document:
--   * jsonb for ordered arrays of small objects (gallery, programme days, faq,
--     practical, ticks, benefits). They are always read and written whole, belong
--     to exactly one parent and have no independent identity.
--   * real join tables for the three cross-type relationships on events, because
--     foundations, experts and partners are shared records edited on their own.
--
-- Ids are slugs, matching the filenames in reference/content/, so the seed is a
-- straight copy and the static site's paths keep resolving.

create extension if not exists "pgcrypto";

-- touch updated_at on every write, so the CMS can show "laatst bewerkt"
create or replace function set_updated_at() returns trigger
language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- ---------------------------------------------------------------- formats ---
create table formats (
  id           text primary key,
  name         text not null,
  bracket_name text not null,
  description  text not null,
  meta         text not null,
  sort_order   int  not null default 0,
  is_hosted    boolean not null default false,
  body         text,
  image        text,
  ticks        jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------ foundations ---
-- The six pillars. `number` is the displayed "01".."06" and is what experts
-- reference — see the note on experts.foundations below.
create table foundations (
  id           text primary key,
  number       text not null,
  name         text not null,
  en_one_liner text not null,
  nl_body      text not null,
  work_on      jsonb not null default '[]'::jsonb,
  image        text not null,
  alt          text not null,
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------- age_groups ---
create table age_groups (
  id         text primary key,
  label      text not null,
  tagline    text not null,
  body       text not null,
  formats    jsonb not null default '[]'::jsonb,   -- display names, not format ids
  image      text not null,
  alt        text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ tiers ---
create table tiers (
  id              text primary key,
  name            text not null,
  investment_from text not null,
  sort_order      int  not null default 0,
  benefits        jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- experts ---
-- `confirmed` is not a soft-delete flag: it means a human verified that this
-- real, named person may be published. Defaults false, and the site must not
-- render a row where it is false.
create table experts (
  id          text primary key,
  name        text not null,
  org         text not null,
  bio         text,
  foundations jsonb not null default '[]'::jsonb,  -- foundation *numbers* ("01"), as in the source data
  portrait    text,
  confirmed   boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- partners ---
create table partners (
  id         text primary key,
  name       text not null,
  logo       text not null,
  url        text not null,
  tier       text references tiers(id) on delete set null,
  is_host    boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- figures ---
-- Claims about outcomes, attached to a period. `confirmed` gates publication for
-- the same reason it does on experts: a wrong true is a public false claim.
create table figures (
  id          text primary key,
  value       numeric not null,
  display     text not null,
  suffix      text,
  label       text not null,
  explanation text,
  period      text not null,
  group_key   text not null check (group_key in ('forAll','reach')),
  sort_order  int not null default 0,
  confirmed   boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------- events ---
-- date_text is kept alongside the real dates on purpose: an edition often has no
-- confirmed date and the page still has to say something honest ("Datum volgt").
-- price is text for the same reason ("Volgt bij bevestiging").
create table events (
  id             text primary key,
  title          text not null,
  format_id      text references formats(id) on delete restrict,
  edition_year   int  not null,
  date_text      text not null,
  date_start     date,
  date_end       date,
  location       text not null,
  age_min        int  not null,
  age_max        int  not null,
  price          text,
  capacity       int,
  status         text not null check (status in ('waitlist','open','full','past')),
  standfirst     text not null,
  intro          text not null,
  hero_image     text not null,
  hero_video     text,
  gallery        jsonb not null default '[]'::jsonb,
  programme_days jsonb not null default '[]'::jsonb,
  faq            jsonb not null default '[]'::jsonb,
  practical      jsonb not null default '[]'::jsonb,
  seo            jsonb not null default '{"title":"","description":""}'::jsonb,
  locale         text not null default 'nl' check (locale in ('nl','en')),
  updated_at     timestamptz not null default now()
);

create index events_status_idx on events (status);
create index events_year_idx on events (edition_year desc);

-- the three shared relationships, ordered so the page renders them as authored
create table events_foundations (
  event_id      text not null references events(id) on delete cascade,
  foundation_id text not null references foundations(id) on delete cascade,
  position      int  not null default 0,
  primary key (event_id, foundation_id)
);

create table events_experts (
  event_id  text not null references events(id) on delete cascade,
  expert_id text not null references experts(id) on delete cascade,
  position  int  not null default 0,
  primary key (event_id, expert_id)
);

create table events_partners (
  event_id   text not null references events(id) on delete cascade,
  partner_id text not null references partners(id) on delete cascade,
  position   int  not null default 0,
  primary key (event_id, partner_id)
);

-- ---------------------------------------------------------------- journal ---
create table journal (
  id            text primary key,
  category      text not null check (category in ('past-event','story','insight','social','partner','news')),
  title         text not null,
  image         text not null,
  alt           text not null,
  meta          text not null,
  published_at  date not null,
  related_event text references events(id) on delete set null,
  locale        text not null default 'nl' check (locale in ('nl','en')),
  body          text not null default '',   -- the Markdown below the frontmatter
  updated_at    timestamptz not null default now()
);

create index journal_published_idx on journal (published_at desc);

-- ----------------------------------------------------------- testimonials ---
-- consent_on_file quotes a parent. Nothing renders without it true, and the
-- table ships empty on purpose: no consent is held. Do not invent quotes.
create table testimonials (
  id              text primary key,
  quote           text not null,
  attribution     text not null,
  edition         text not null,
  consent_on_file boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- updated_at triggers
do $seed$
declare t text;
begin
  foreach t in array array[
    'formats','foundations','age_groups','tiers','experts','partners',
    'figures','events','journal','testimonials'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $seed$;
