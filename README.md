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

The joined view: who visited, who signed up, and what sold — the four tiers
08-DASHBOARD asks for, in one screen.

| Tier | Panel | Source | Needs |
|---|---|---|---|
| 1 | Content and consent | our Postgres | nothing |
| 2 | Signups per edition | Brevo | `BREVO_API_KEY` |
| 3 | Ticket sales | Ticket Tailor | `TICKET_TAILOR_API_KEY` |
| 4 | Traffic | Plausible | `PLAUSIBLE_API_KEY`, `PUBLIC_PLAUSIBLE_DOMAIN` |
| 4 | Attribution and conversion | our Postgres | nothing |

**Every panel fails soft, with the reason on screen.** A missing key or a dead
upstream marks that source unavailable and says which variable is absent; the
rest of the page still works. The project's own lesson is that a silent success
and a silent failure must never look identical.

**Tier 4's attribution half deliberately does not use Plausible.** Since
`/api/subscribe` came in-house, every signup is recorded with the page, referrer
and campaign it arrived through. That answers the brief's "which campaign drove
each signup" from our own rows rather than by inference from a traffic tool, it
needs no key, and it works on the free tier of everything. Plausible is asked
only how many people came, so conversion is a real ratio — their visitors over
our signups — rather than two numbers from two systems that count differently.

Plausible's Stats API is plan-gated. When it refuses, the panel says that rather
than showing an empty chart, because "upgrade your plan" and "your key is wrong"
need different actions.

**`undelivered` is the number to act on.** A signup that reached us but not
Brevo is not lost — it is in `subscriptions` waiting to be replayed — and
without a count nobody would think to look.

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

## The homepage's moving parts

Three things on the homepage are driven by JavaScript, and all three are the
static site's own scripts rather than reimplementations.

**The preloader.** EXPERIENCES / CONNECTION / GROWTH, landing on [IMPACT] before
the curtain opens. It runs once per session, decided by a boot script in
`app.html` that must run before first paint — by the time a deferred script
executes, the page is painted and the curtain would drop over content the
visitor has already seen. `/admin` and `/login` are excluded: they share the
shell but have no preloader markup, so the class there would only lock the
scroll until the failsafe fires.

**The hero aftermovie.** A page can carry an optional WebM and MP4 under its
hero. The still stays the poster and `main.js` only mounts the video once the
WebM actually resolves and `prefers-reduced-motion` is not set — so a page with
no clip, a slow connection, or a visitor who asked for less motion all render
the still, unchanged.

**The reel.** See the section types below; `cinema.js` pins it and drives it
from scroll position.

GSAP is loaded only for the pages that need it — a page with no preloader to run
and no reel to drive never downloads it.

## Sections and vertical rhythm

A section in the editor is one `<section>` on the page, and that is load-bearing:
`.section` carries the page's vertical padding, so splitting a heading and the
list it introduces into two sections puts a full section's padding between them.
The site groups them — `#events` is one section holding both its `.sec-head` and
its event rows — so the seed converts a heading into the collection beneath it
rather than appending a second section after it.

For the same reason the partner marquee is rendered without a section wrapper:
it carries its own padding and its own top and bottom border, and on the static
site it sits outside every `<section>`, between the last one and the footer.

Two other things that read as spacing but are markup: a section title's size
(`headingStyle` — the site sizes a title to its length, and a 60px heading
dropped to the default changes the rhythm of the whole block), and whether a
`media_text` uses `two-col--media`, which sizes the picture as a direct child.
Both are fields rather than guesses, because both vary section by section.

## Images

Image fields are uploads, not typed paths. Files are written to `cms/uploads/`,
one folder per record:

```
uploads/<table>/<record-id>/<field>-<content-hash>-<width>.<ext>
```

so everything belonging to one edition sits together, and deleting the record
takes its folder with it. Filenames carry a content hash rather than the name the
browser sent, which removes collisions, other people's spelling, and the usual
route for a traversal.

### Responsive variants

Beside every uploaded photo sits a ladder of smaller AVIF and WebP copies:

```
hero-a1b2c3d4e5-1600.jpg        the original, 1600px wide
hero-a1b2c3d4e5-1600.420.avif   420, 640, 900, 1280 and 1600 wide,
hero-a1b2c3d4e5-1600.420.webp   in both formats
```

and the public site renders `<picture>` with a `srcset`, exactly as the static
site does. This is what a phone actually downloads, so the difference is not
cosmetic: the homepage's seventeen images are 1.50 MB as originals and 176 KB as
the 420px AVIF set.

**The intrinsic width is in the filename** because the renderer builds the
`srcset` during SSR, where it cannot look at the disk. Reading the width from the
name means the markup only ever advertises widths that were really produced —
no 404s, and no variant claiming detail it does not have. A file whose name has
no width is understood as "no variants" and rendered as a plain `<img>`, which
is why nothing broke while the backfill was catching up.

Widths come from `src/lib/images.ts`, which is also where a `role` maps to the
`sizes` attribute — `wide` for heroes and full-bleed media, `card` for grids and
the scrolling strip, `portrait` for headshots and logos. The `sizes` strings are
lifted from the static site so the browser makes the same choice here.

Three things happen so this stays true without anyone maintaining it:

- **On upload.** The photo is downscaled to 2560px if it is larger — a phone
  photo is routinely 4000px wide and no layout here is over 1296 CSS pixels —
  and the ladder is generated. A 1600px source costs about a second.
- **On request.** A missing rung is generated by `routes/uploads/[...path]` and
  cached to disk. Only widths on the ladder and at or below the original's own
  width are honoured; anything else is a 404, so this is not an open
  image-resizing service someone can spend the server's CPU on.
- **On replace or delete.** The ladder is removed with the original. Skipping
  this would leave ten or twelve orphans behind every replaced image.

`npm run images:variants` backfills anything uploaded before this existed:
it renames the original to carry its width, generates the ladder and rewrites
every reference, including the ones nested in section JSON such as the reel's
per-clip posters. It is idempotent — a second run only checks for missing rungs.

```bash
npm run images:variants
npm run images:variants -- --dry-run
```

Sharp is the only native dependency in the project, so it is confined to
`src/lib/server/variants.ts` and imported lazily. If the binary will not install
on a host, the CMS still runs; images are simply served at one size.

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

Video is allowed too — WebM and MP4, for the reel's clips — with its own
ceiling (64 MB against 8 MB for images), because a clip is an order of magnitude
larger than a photo and one number would be wrong for one of them. Type is still
decided by magic number: EBML for WebM, an ftyp box for MP4.

A repeatable row can hold uploads, and more than one: a reel clip is an MP4, an
optional WebM and a poster image, each with its own preview.

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

The homepage is a configured page like any other: `/` renders the `home` record,
hero and sections, with the foundations, the upcoming editions and the journal
teaser coming from `collection` sections rather than from the route. What appears
on the homepage is a backoffice decision.


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

page_sections  page_id, locale, position, type, ground, anchor, content jsonb
```

**The section types are typed, not generic blocks.** Each maps onto markup the
stylesheet already has, so a page assembled in the backoffice renders as the
site rather than as a page builder's idea of one. `src/lib/sections.ts`
describes them once and both the editor and the renderer read that description.

There are eighteen. The first seven are the ordinary furniture; the rest exist
because a specific block on a specific page needed markup that nothing else
produces, and lifting it as prose would have lost it.

| Type | Renders | Where it came from |
|---|---|---|
| `sec_head` | `.sec-head` — running label, title, lead, optional right-hand link | Everywhere |
| `rich_text` | A prose block. The fallback when nothing else fits | Privacy, odd corners |
| `media_text` | `.two-col`, with or without `--media`. Optionally a callout box, contact rows and a boilerplate quote | Most pages |
| `collection` | Records from Inhoud, in one of twelve presentations | Everywhere |
| `cta_cards` | `.cta-cards` | Page ends |
| `band` | `.band` | Page ends |
| `news_band` | The newsletter form, narrow or two-column | Every page |
| `downloads` | `.dl-list` | Media, Contact |
| `split_list` | `.split-list` | Hosted Experiences |
| `numbered_list` | Six shapes: routes, layers, steps, options, format rows, contribution rows | Home, Over, Samenwerken, Social Impact, Hosted |
| `reel` | The pinned scroll cinema. **Consent-gated** | Home |
| `founders` | Two long portraits with quotes, plus the shared closing note | Over |
| `team` | Core-team cards, then the expert grid from Inhoud | Over |
| `form` | The contact and request forms, with the fields as rows | Contact, Hosted |
| `cine` | The full-bleed showcase video with its glass caption | Media |
| `vcards` | A grid of participant clips. **Consent-gated** | Media |
| `mosaic` | The photo archive lightbox.js opens | Media |
| `legal` | Headed blocks with a summary card beside them | Privacy |
| `metabar` | The spec bar under the hero | Hosted, event template |

Two of them render **nothing** without a tick: `reel` and `vcards` show
minors, and 01-BRIEF records the written parental consent as not held. The
section shows its heading and text and no clips at all. That is the feature.

Three render outside a `<section>` on purpose — the partner marquee, `cine` and
`metabar` — because each carries its own background or borders and a section's
padding would push it away from what it belongs to. `.section` is where the
page's vertical rhythm lives, so a wrapper is never neutral.

**The per-format sections on /events are a `collection` slot.** `#days`,
`#camps`, `#retreats` and `#community` are the format records rendered as detail
blocks. The page decides whether they appear, on what ground, how many, and
whether a heading sits above them; the words and images stay in Inhoud →
Formats, because those same records also feed the black format strip higher up
the page and two copies of one sentence drift apart. Delete the slot and the
sections go; the hardcoded fallback only applies to a page that has never been
configured.

**A `collection` section has a presentation.** The same records look different
in different places — foundations are a grid on the homepage and full-width
blocks with images on Over; formats are a black strip on /events and cards
elsewhere. One section type carries a `presentation` field for that, defaulting
to whatever is natural for the source, so the page decides the look and the
records stay in one place.

**A `collection` section points at existing content** rather than repeating it.
Foundations, formats, age groups, tiers, partners, figures and experts already
have their own screens; a generic block builder would invite someone to retype
them as loose text. The consent gates still apply — the public page reads as
anon, so unconfirmed experts and figures are filtered by policy before they
reach the renderer.

`published` is a draft flag, not a consent gate: unpublished pages stay editable
and return 404 to visitors, enforced by RLS rather than by the route.

### The participant reel

The homepage reel shows four clips of minors. 01-BRIEF.md records that written
parental consent per clip had not been provided, and says plainly: *do not
design a feature that assumes they stay.* So the `reel` section carries its own
consent tick, off by default and off in the seed. Without it the section renders
its heading and no clip markup at all — not a hidden video, no `<video>` element
on the page. Ticking it is a deliberate act by someone who holds the paperwork.

The video files are not in this repo. Copy `site/assets/video` into
`cms/static/assets/` locally; it is gitignored for the same reason.

### The nav follows what exists

The shell links to a page when this app serves it and out to the static build
when it does not, driven by the published slugs rather than a hand-kept list. As
more pages moved into the CMS the nav followed them without anyone editing it.
`PUBLIC_STATIC_SITE_BASE` now only catches what is genuinely still elsewhere —
today, the brochure PDF.

### Creating and deleting pages

Full CRUD, with one guard: `home`, `events`, `journal` and `event-detail` are
read by route files, so deleting one would not remove a page from the site, it
would leave a route reading a record that is not there. They stay editable and
cannot be deleted — checked on the server, not just hidden in the UI.

A new page starts unpublished, because an empty page should not appear on the
site the moment it is created.

### Templates

`event-detail` is a page whose content is read by another route rather than
served at its own URL: every `/events/<slug>` takes its section labels, its
waitlist card copy and its contact band from it, so changing "Praktisch" is one
edit rather than one per edition. `is_template` marks it, `/[slug]` refuses to
serve it, and the backoffice lists it as *(sjabloon)*.

### Seeding

`npm run seed:pages` lifts the pages out of `site/*.html` **and `site/en/*.html`**
— hero, section headings, leads, two-column blocks, CTA cards, bands, download
lists and split lists. Both languages come from the site's own generated
English, so nobody retypes 900 strings that are already correct. The screens
open with the client's words rather than empty forms or invented copy:

```
home (nl)             12 secties
home (en)             12 secties
over (nl)              7 secties
event-detail (nl)      9 tekstblokken
```

Nothing is reported as unrecognised any more: `downloads` covers the /media file
list and `split_list` covers the two-column comparison on /hosted-experiences,
which were the last two blocks a person could not edit.

## What is still open

**[OPEN-ITEMS.md](OPEN-ITEMS.md)** — checked against the live site after the
first deploy. What is unfinished, what is a decision rather than a task, and
what should deliberately stay as it is, with the steps for each.

The short version: the waitlist form needs one environment variable to become
usable, three blocks are empty because their consent gates are doing their job,
and the privacy text is drafted and waiting on a lawyer.

## Deploying

**[DEPLOYMENT.md](DEPLOYMENT.md)** is the step-by-step: Supabase project,
migrations, auth, the storage bucket, seeding, the Vercel project, every
environment variable and what breaks without it, and what to verify afterwards.

The one thing to know before reading it: **uploads cannot live on the Vercel
filesystem.** It is read-only and ephemeral, so an uploaded image is gone on the
next invocation and every photo 404s within minutes. Uploads go to a Supabase
Storage bucket instead — already in the stack, no new vendor.

`src/lib/server/storage.ts` holds both backends behind one interface, chosen by
whether `PUBLIC_SUPABASE_STORAGE_BUCKET` is set. The default is Supabase
whenever it is, **including locally**: a dev environment that exercises a
different storage path from production cannot catch storage bugs, and this one
was caught exactly that way.

The stored path does not change either way — columns keep
`/uploads/<table>/<id>/<file>` and `imageUrl()` maps it at render time — so
switching backends is a config change, not a content migration.

```bash
npm run storage:push          # move the local uploads folder into the bucket
ADAPTER=node npm run build    # check a production build on Windows, where the
                              # Vercel adapter cannot symlink
```

## Not done

- **Translation pairing.** `locale` is still one record per language rather than
  paired translations, exactly as the current model has it.
  `05-DESIGN-SYSTEM.md` says this is the one thing worth
  improving if you touch the model; it was left alone so the seed stays a faithful
  copy of the source content.
- **Publishing the site.** Phase two, and bigger than it looks: the Python
  pipeline also does the English generation, the SEO head blocks, the sitemap and
  an HTML validity check.
