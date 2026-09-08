# IMPACT backoffice

The CMS the brief asked for and the project never had. SvelteKit + TypeScript,
Supabase for Postgres and auth, Vercel as the deploy target — the stack settled
in `06-CMS-SCOPE.md` of the handoff folder.

**What it is:** a working backoffice over the ten content types, with the client's
real content in a real database.

**What it is not, yet:** the thing that publishes the website. The static site
stays static and stays on Netlify. Say this out loud in the demo — letting the
client assume otherwise becomes a problem in week three.

---

## Run it

```bash
cd cms
npm install

# 1. a database. Either a Supabase project, or locally:
supabase start                      # needs Docker
supabase db reset                   # applies supabase/migrations/

# 2. credentials — `supabase status` prints them for the local stack
cp .env.example .env                # then fill in URL, anon key, service role key

# 3. the client's real content — it lives in the handoff folder, not in this
#    repo. Point at it if this repo is not sitting inside that folder:
#    export IMPACT_CONTENT_DIR=/path/to/handoff/reference/content
npm run seed

# 4. an account (there is no self-registration)
npm run user:create -- you@example.com 'a real password'

npm run dev                         # http://localhost:5273
```

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
src/lib/collections.ts THE FILE TO READ FIRST. Ten content types, every field
src/lib/records.ts     form → row, and the Dutch validation messages
src/lib/server/        database access, and the Brevo / Ticket Tailor reads
src/routes/(app)/      the backoffice; content/[collection] is generic over the
                       registry, so all ten types share one list and one form
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
off in the Supabase dashboard; accounts are made with `npm run user:create`. RLS
gives `authenticated` full access to the content tables and `anon` nothing at
all — an anon-readable content API would leak exactly the rows whose consent flag
is still false.

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
