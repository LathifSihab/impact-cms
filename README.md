# IMPACT backoffice

The CMS the brief asked for and the project never had. SvelteKit + TypeScript,
Supabase for Postgres and auth, Vercel as the deploy target — the stack settled
in `06-CMS-SCOPE.md` of the handoff folder.

**What it is:** a backoffice over the ten content types, plus the public
`/events` and `/journal` pages rendered live from the same database. Edit an
edition and the page changes on reload — no rebuild, no deploy.

**What it is not:** the whole website. Seven prose pages (home, Over, Contact,
Samenwerken, Social Impact, Media, Hosted Experiences, Privacy) are still the
static build on Netlify. Say which half is which in the demo.

---

## Run it

```bash
cd cms
npm install

# 1. a database. Either a Supabase project, or locally:
supabase start                      # needs Docker
supabase db reset                   # applies supabase/migrations/

# 2. credentials — writes .env from the running local stack
npm run env:local

# 3. the client's real content — it lives in the handoff folder, not in this
#    repo. Point at it if this repo is not sitting inside that folder:
#    export IMPACT_CONTENT_DIR=/path/to/handoff/reference/content
npm run seed

# 4. an account (there is no self-registration)
npm run user:create -- you@example.com 'a real password'

npm run dev                         # http://localhost:5273
```

| | |
|---|---|
| Public site | http://localhost:5273/ and `/en` — no login |
| Backoffice | `http://localhost:5273/admin` |

Do **not** `cp .env.example .env`. That template ships with empty values, so the
copy leaves you configured with nothing — and running it a second time silently
overwrites a working `.env`. Both look identical from the app: *"Your project's
URL and Key are required to create a Supabase client"*. `npm run env:local`
reads the running stack and writes the file, keeping any Brevo or Ticket Tailor
key already in there. For a hosted project, fill `.env` in by hand from Project
Settings → API.

Two things about the local stack that cost time here, both already applied to
`supabase/config.toml`:

- **The ports are not the defaults.** This machine already runs another local
  Supabase project on 54321–54327, and two stacks cannot share them. This one
  uses 54361 (API), 54362 (db), 54363 (Studio), 54364 (mail), 54367 (analytics).
- **`[auth.email].enable_signup = false` disables email *logins*, not just
  registration** — the CLI maps it onto the email provider itself, and every
  login then fails with `email_provider_disabled`. The global
  `[auth].enable_signup = false` is the one that blocks self-registration, and
  that is the one set here.

**[TESTING.md](TESTING.md) walks the whole thing end to end** — by hand in a
browser, then over HTTP, then the security checks. Start there if you want to
confirm it works rather than read about it.

`npm run check` typechecks. `npm run build` builds for Vercel;
`ADAPTER=node npm run build` builds a plain Node server instead, which is also
the way to build on a Windows machine without Developer Mode — the Vercel
adapter needs symlinks.

## What is where

```
supabase/migrations/   the schema, then the RLS policies
scripts/seed.ts        loads reference/content/ — the real events, journal,
                       partners, experts, formats, foundations, tiers, figures
scripts/create-user.ts makes a login
scripts/env-local.ts   writes .env from the running local stack
scripts/migrate-images.ts  legacy assets/... paths -> managed uploads
scripts/seed-pages.ts  lifts the eight prose pages out of site/*.html
src/lib/collections.ts THE FILE TO READ FIRST. Ten content types, every field
src/lib/records.ts     form → row, and the Dutch validation messages
src/lib/server/        database access, and the Brevo / Ticket Tailor reads
src/routes/admin/      the backoffice; content/[collection] is generic over the
                       registry, so all ten types share one list and one form
src/routes/(site)/     the public pages, one set of files for both languages
src/lib/server/site.ts the public reads: locale-aware, relationships resolved
src/lib/i18n.ts        the chrome strings for nl and en
src/lib/markdown.ts    escape-first Markdown for journal bodies
```

### The registry

Every screen is generated from `src/lib/collections.ts`. A new field is one entry
there — the list view, the form, the validation and the database write all follow.
The field kinds cover the shapes the content actually has: text, markdown, number,
date, select, boolean, single and multi references, string lists, and repeatable
rows of small objects (gallery, programme days, FAQ, practical).

This is why there are two route files for ten content types instead of twenty.

## Decisions worth not reversing by accident

**The consent gate is not a checkbox.** `confirmed` on experts and figures,
`consent_on_file` on testimonials. These mean a human verified that a named real
person, or a public claim about outcomes, may be published. They default to
false, they are rendered as their own block stating the consequence, and the
dashboard lists everything they are currently holding back. A generic CMS treats
these as ordinary booleans; that is the difference worth keeping.

**`testimonials` is empty and should stay empty** until parental consent actually
exists. The seed leaves it alone deliberately.

**jsonb for ordered arrays of small objects, join tables for the three shared
relationships.** Gallery rows and FAQ entries are always read and written whole
and belong to one event. Foundations, experts and partners are shared records
edited on their own, so they are real foreign keys. Reasoning in
`03-DATA-MODEL.md` of the handoff folder.

**`date_text` and `price` are text.** An edition often has no confirmed date and
no confirmed price, and the page still has to say something honest — "Datum
volgt", "Volgt bij bevestiging". Do not normalise them without keeping a display
field.

**Auth is Supabase Auth, and there is no self-registration.** Turn email signups
off in the Supabase dashboard; accounts are made with `npm run user:create`.

**Everything private lives under `/admin`, and that prefix is the access rule.**
The guard used to be deny-by-default with an allowlist, which is right for an app
with no public face. This one has a public face now, so the rule inverted: put a
backoffice route anywhere else and it will not be protected.

**`anon` can read, but only through policies that enforce consent.** Events,
journal and the taxonomy tables are readable. `experts` filters on `confirmed`,
`figures` on `confirmed`, `testimonials` on `consent_on_file` — in the policy,
not in a query, so a page that forgets to filter still cannot publish a name
nobody approved. `anon` has SELECT and nothing else.

**The service-role key is never imported by the app.** Only the two scripts use
it. The app runs on the anon key with RLS.

## Signalen

The one screen that beats an off-the-shelf tool: editions from this database,
signups from Brevo, sales from Ticket Tailor, joined on the event slug that the
signup form sends as the `EVENT` attribute.

Read-only, on purpose. Brevo owns the list, Ticket Tailor owns the orders, and
neither gets a second author. Without `BREVO_API_KEY` or `TICKET_TAILOR_API_KEY`
the page says which source it could not read and why, rather than showing an
empty table that looks like "no signups" — this project has already lost a day to
a failure that looked like a success.

It also lists signups whose `EVENT` matches no edition. Those contacts fall
outside the segment when registration opens, which is a real and otherwise
invisible way to lose people.

## What this deliberately does not do

Payments, checkout, orders, registrations, tickets, attendance, participants, and
sending email. Ticket Tailor owns commerce and Brevo owns sending. Rebuilding
either gives you two systems that both believe they own an order — the most
expensive mistake available here, per `07-DECISIONS.md` of the handoff folder.

## The public site

`/events`, `/events/[slug]`, `/journal`, `/journal/[slug]`, each also under
`/en`, from one set of route files via an optional `[[lang=lang]]` segment.
Dutch sits at the root because that is where the live URLs are.

**The markup is the static site's, not a lookalike.** Sections, classes and
order are transcribed from `site/events.html`, `site/event.html` and
`site/journal.html`, and `assets/` is served from `static/assets/`, so the same
stylesheet and the same `assets/js` files do the work they were built for —
sticky nav, mobile menu, reveal-on-scroll, cookie consent, the newsletter dome,
the journal filter chips, the box office widget. What changed is where the
content comes from:

| Page | From the database |
|---|---|
| `/events` | upcoming `event-row`s, the format strip, the per-format sections, the full overview table |
| `/events/<slug>` | hero, metabar pairs, programme `day-row`s, `fund-grid`, `expert-grid`, FAQ, gallery, partners, practical sidebar |
| `/journal` | the feature, the `jcard` grid, and the filter chips (only for categories that have posts) |

The prose around them — hero copy, section leads, CTA cards — is hand-authored
on the static site with no content type behind it, so it is reproduced as
written.

This closes the brief's hardest requirement. The static site has a single
`event.html` hardcoded to Basketball Edition 2027, and all nine links on its
events list point at it — every edition shows the same page. Here each edition
has its own URL from its own row, and adding one needs no rebuild.

### What it does not own

Only Events and Journal come from the CMS. Over, Samenwerken, Social Impact,
Media, Contact, Privacy and Hosted Experiences are still the static build, and
the nav links out to it through `PUBLIC_STATIC_SITE_BASE`. Leave that empty and
those links stay relative, which means they 404 locally.

The **waitlist form** posts to the live Netlify function via
`PUBLIC_SUBSCRIBE_ENDPOINT`; that endpoint keeps running where it is and must
not be rebuilt here.

`static/assets/` carries brand, css and js. `assets/img` and `assets/video` are
gitignored — 17 MB and 19 MB, and the photography includes minors whose consent
is not held. Drop them in locally and the pages fill out.

Translation is a fallback, not a pairing: the model stores one row per language,
so an English page with no English row shows the Dutch text with English chrome.
Fixing that properly is still the open item below.

## Images

Image fields are uploads, not typed paths. Files are written to `cms/uploads/`,
one folder per record:

```
uploads/<table>/<record-id>/<field>-<content-hash>.<ext>
```

so everything belonging to one edition sits together, and deleting the record
takes its folder with it. Filenames carry a content hash rather than the name the
browser sent, which removes collisions, other people's spelling, and the usual
route for a traversal.

`npm run images:migrate` moves the seeded `assets/...` paths into that layout and
rewrites the columns — the ten content types, the page heroes and the images
inside page sections. It is idempotent, and it reports anything it cannot find
rather than blanking the value.

The photography is not in this repo. Point `--source` at wherever it lives; once
`site/assets/img` is populated the migration completes with nothing missing:

```bash
npm run images:migrate -- --source ../site/assets
npm run images:migrate -- --dry-run          # report only
```

**Where an image is configured** follows the same rule as the copy: an image
belonging to a record is on that record's screen — the format images under
Inhoud → Formats, the foundation images under Fundamenten — while a page's hero
and its section images are under Pagina's.

### Three things here that were decided, not defaulted

**Not `static/`.** That directory is copied into the build output when the
adapter runs, so a file written at runtime would never be served from it.
`routes/uploads/[...path]` serves the folder instead, refusing traversal by
checking the resolved absolute path rather than the string.

**Not committed.** `uploads/` is gitignored. This repo is public and the
photography includes minors whose written parental consent 01-BRIEF records as
never provided — committing it is exactly the harm the consent gates exist to
prevent. Back the folder up with the deploy, not with git.

**Not on Vercel as it stands.** A folder on disk needs a real volume, and
Vercel's runtime filesystem is read-only and ephemeral: uploads will appear to
work and then vanish. Deploy to a host with a mounted volume, or reimplement
`save`, `remove` and `publicPath` in `src/lib/server/uploads.ts` against Supabase
Storage — everything else is behind that one module.

SVG is rejected. It is an image to a designer and a script host to a browser, and
these files are served from the same origin as the backoffice. Type is decided by
magic number, not by the `Content-Type` the client claims.

## Page configuration

`/admin/pages` configures the eight prose pages — Home, Over, Samenwerken,
Social Impact, Hosted Experiences, Media, Contact, Privacy — plus the copy on
the two list pages, Events and Journal.

The rule is: **records live in Inhoud, page copy lives in Pagina's.** Each
edition is still edited under Inhoud → Events; what Page Configuration owns on
those two pages is the hero and the section headings around the list, addressed
by *anchor* rather than by position, so reordering cannot move the intro into
the middle of the table. A section added there that is not one of the fixed
slots renders after the fixed layout rather than being silently dropped.

A page exists once per language: `pages` is keyed on `(id, locale)`, and the
editor has language tabs. Opening a language that does not exist yet pre-fills
from the Dutch row so the editor is translating rather than starting from
nothing; saving creates it. The public page falls back to Dutch when there is no
English row, the same as events and journal.

A page is a row plus an ordered list of sections:

```sql
pages          id (slug), locale, nav_label, sort_order, hero_label,
               hero_title, hero_intro, hero_image, hero_variant, seo,
               published

page_sections  page_id, position, type, ground, anchor, content jsonb
               -- type: sec_head | rich_text | media_text | collection
               --     | cta_cards | band | news_band
```

**The section types are typed, not generic blocks.** Each maps onto markup the
stylesheet already has — `.sec-head`, `.two-col--media`, `.cta-cards`, `.band`,
`.news-band` — so a page assembled in the backoffice renders as the site rather
than as a page builder's idea of one. `src/lib/sections.ts` describes them once
and both the editor and the renderer read that description.

**The per-format sections on /events are a `collection` slot.** `#days`,
`#camps`, `#retreats` and `#community` are the format records rendered as detail
blocks. The page decides whether they appear, on what ground, how many, and
whether a heading sits above them; the words and images stay in Inhoud →
Formats, because those same records also feed the black format strip higher up
the page and two copies of one sentence drift apart. Delete the slot and the
sections go; the hardcoded fallback only applies to a page that has never been
configured.

**A `collection` section points at existing content** rather than repeating it.
Foundations, formats, age groups, tiers, partners, figures and experts already
have their own screens; a generic block builder would invite someone to retype
them as loose text. The consent gates still apply — the public page reads as
anon, so unconfirmed experts and figures are filtered by policy before they
reach the renderer.

`published` is a draft flag, not a consent gate: unpublished pages stay editable
and return 404 to visitors, enforced by RLS rather than by the route.

### Seeding

`npm run seed:pages` lifts the pages out of `site/*.html` — hero, section
headings, leads, two-column blocks, CTA cards, bands — so the screens open with
the client's own words instead of eight empty forms or invented copy. It reports
what it could not place rather than mangling it:

```
home                  9 secties
over                  7 secties
hosted-experiences    4 secties   (1 niet herkend)
```

The bespoke bits — the homepage cinema reel, the founders block, the contact
form — have no section type and are still the static site's markup. Add them as
sections in the editor, or leave them.

## Not done

- **Translation pairing.** `locale` is still one record per language rather than
  paired translations, exactly as the current model has it.
  `05-DESIGN-SYSTEM.md` says this is the one thing worth
  improving if you touch the model; it was left alone so the seed stays a faithful
  copy of the source content.
- **Publishing the site.** Phase two, and bigger than it looks: the Python
  pipeline also does the English generation, the SEO head blocks, the sitemap and
  an HTML validity check.
