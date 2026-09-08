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
| Backoffice | http://localhost:5273/**admin** |

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

This closes the brief's hardest requirement. The static site has a single
`event.html` hardcoded to Basketball Edition 2027, and all nine links on its
events list point at it — every edition shows the same page. Here each edition
has its own URL from its own row, and adding one needs no rebuild.

Two things it does not own. The **waitlist form** posts to the live Netlify
function via `PUBLIC_SUBSCRIBE_ENDPOINT`; that endpoint keeps running where it
is and must not be rebuilt here. **Images** are still the static site's paths
(`assets/img/...`), so they 404 until that folder is served alongside.

Translation is a fallback, not a pairing: the model stores one row per language,
so an English page with no English row shows the Dutch text with English chrome.
Fixing that properly is still the open item below.

## Not done

- **Image uploads.** Images are still path strings pointing at `assets/img/...`,
  which is what the static site resolves. Supabase Storage is the obvious home,
  but the existing paths have to keep working.
- **Translation pairing.** `locale` is still one record per language rather than
  paired translations, exactly as the current model has it.
  `05-DESIGN-SYSTEM.md` says this is the one thing worth
  improving if you touch the model; it was left alone so the seed stays a faithful
  copy of the source content.
- **Publishing the site.** Phase two, and bigger than it looks: the Python
  pipeline also does the English generation, the SEO head blocks, the sitemap and
  an HTML validity check.
