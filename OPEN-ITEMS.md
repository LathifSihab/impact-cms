# What is open, and what to do about it

Written after the first production deploy. Everything here was checked against
the live site and the production database, not recalled.

**Live:** https://demo-impact-cms.vercel.app
**Supabase project:** `abhdxincjkexashveyon`

---

## Where things stand

| | |
|---|---|
| All 11 pages, Dutch and English | live, 200 |
| Images | 99 originals + 582 responsive variants, served from Supabase Storage |
| Backoffice | live, guarded, one account |
| Database | 19 migrations applied, fully seeded |
| Dashboard tiers 1–4 | live, including the embedded Plausible dashboard |
| Analytics | live and verified in the page source; runs unconditionally (§6) |
| Signup endpoint | in-house at `/api/subscribe`, receipts in Postgres |

What follows is what is *not* finished, ordered by what actually costs you
something today.

---

## 1. The waitlist and newsletter forms — **done**

They were the one thing a visitor could actually *do* on the site, and every
event page used to say the form was not connected.

The endpoint could not simply be re-pointed: it was a serverless function living
in the Netlify repository, and there is no such function on Vercel. It is now
`/api/subscribe`, served by this app — a port of `reference/subscribe.mjs` with
the same fields, status codes and JSON, because the forms posting to it are the
same forms. The forms default to it, so no variable is needed;
`PUBLIC_SUBSCRIBE_ENDPOINT` survives only as an override.

One thing had to change rather than be copied. The original leaned on Netlify
Forms for an audit copy — *"a Brevo outage degrades to 'not segmented yet'
rather than 'lost'"*. Nothing holds that copy now, so the row is written to
Postgres first and handed to Brevo second, with Brevo's answer recorded on it.
`/admin/signalen` counts the ones Brevo did not take, so a failed batch can be
found and replayed rather than guessed at.

**Verified against production:** 405 on GET, 422 with field errors on a bad
body, 200 and silence for the honeypot, 403 for a cross-site POST, and a valid
waiting-list signup landing as a row with its consent, age, edition and campaign
attribution alongside `brevo_ok: true, brevo_status: 201`.

Brevo lists are set — 3 Newsletter, 4 Waitlist. Without them a contact is
created and carries its attributes but joins no list, which is easy to miss.

**Worth doing once:** submit a real address of your own on
https://demo-impact-cms.vercel.app/events, then check Brevo → Contacts → list 4
and `/admin/signalen`. It is the only part of this nobody has exercised as a
human.

---

## 2. The box office link — **done**

`PUBLIC_TICKET_TAILOR_BOX_OFFICE` is set to `https://buytickets.at/wemadeimpact`,
which redirects to `tickettailor.com/events/wemadeimpact`.

It still shows nowhere, and that is correct: the link only renders for an
edition whose status is `open`, and all four are `waitlist` or `past`. Ticket
Tailor also has zero events entered. When you are ready, do it in this order —

1. Enter and publish the event in **Ticket Tailor**.
2. Set the edition to **Inschrijvingen open** in `/admin/content/events`.

Doing 2 first gives visitors a button to an empty shop.

---

## 3. Finish the Supabase auth setup

**Nearly done — confirm you pressed Save.**

The Site URL is filled in with `https://demo-impact-cms.vercel.app`. In the
screenshot the **Save changes** button was still active, which is how that page
looks when the value has been typed but not committed. Worth one glance.

Supabase → **Authentication → URL Configuration → Site URL**:

```
https://demo-impact-cms.vercel.app
```

Without it, auth redirects can bounce to the wrong origin. Login works today
because the flow is same-origin, but password recovery and any future magic-link
flow would break.

While you are there, confirm:

- **Authentication → Providers → Email:** enabled
- **Authentication → Sign In / Providers:** *Allow new users to sign up* is
  **off**

> Do not turn off the email *provider* to stop signups — that disables logins
> too, and reports `email_provider_disabled`, which does not say so.

---

## 4. Publish the content that is being withheld

**Priority: medium. This is a decision, not a task — nothing here is broken.**

Three blocks on the live site render empty on purpose. Every one is a consent
gate doing its job, and each is a question only you can answer.

### The six figures — 0 of 6 confirmed

`#impact` on Social Impact and `#bereik` on Samenwerken are both empty.

**The question:** are these numbers verified and ready to be public claims?

| | |
|---|---|
| Participants | 30 |
| IMPACT FOR ALL | 11 |
| Sponsors | 4 |
| Website visitors | 1.500+ |
| Newsletter sign-ups | 200+ |
| Instagram followers | 600+ |

**To publish:** `/admin/content/figures` → open each → tick **Bevestigd** →
save. They appear immediately; no deploy needed.

### The three experts — 0 of 3 confirmed

The expert grid on Over is empty.

**The question:** have Julie Dingemans, TaPas City Crew and Olivier Goetgeluck
each agreed to be named on the public site?

**To publish:** `/admin/content/experts` → tick **Bevestigd** on each.

### The participant clips — consent not recorded

The homepage reel and the Media video grid render their heading and text and
**no clips**.

**The question:** do you hold written parental consent, per clip, for the four
minors on camera? `01-BRIEF.md` records that you did not as of 9 September.

**To publish:** `/admin/pages/home` → the Videoreel section → tick
**Schriftelijke toestemming van de ouders is op dossier**. Same on
`/admin/pages/media` for the video cards.

**Do not tick this one to make the page look finished.** If the consent never
arrives, the clips come down — design for that, not around it.

### Testimonials — empty by design

`testimonials` has 0 records and `reference/content/testimonials.json` is `[]`
on purpose: no parent consent is held. Leave it empty rather than inventing
quotes.

---

## 5. The privacy policy needs your lawyers

**Priority: medium — it is a legal dependency, and the forms link to it.**

`/privacy` is drafted in both languages and ready for review. Everything
answerable from what the site actually does is written out, with the source for
each claim recorded in `scripts/privacy-text.ts`.

**Four things are still `[ bracketed ]` because this repository does not know
them, and a company registration number is not something to guess:**

- Legal name
- Legal form (vzw or bv)
- Registered office address
- Company number (`BE 0xxx.xxx.xxx`)

**One thing needs a decision rather than a lookup:** the retention periods. They
are written as a concrete proposal and flagged as needing confirmation.

**Two questions a reviewer will raise, already drafted:** whether a DPO is
required, and the basis for the two processors outside the EEA.

### Steps

1. Send `/privacy` and `/en/privacy` to your lawyers.
2. Fill the four identity fields in `/admin/pages/privacy` → the *Juridische
   tekst* section → **Tekstblokken** → the first block.
3. Confirm or change the retention periods in the fourth block.
4. When it is signed off, **clear the "Waarschuwing bovenaan" field**. The
   orange draft banner disappears. That is the switch — there is no code change.

---

## 6. Plausible — **done**, with one thing for the lawyers

Tracking is live and visible in the page source. It took two fixes, because it
was broken twice over and neither failure said anything.

**It was loading the wrong kind of script.** Plausible ships two formats. The
classic one (`/js/script*.js`) is told which site it belongs to by a
`data-domain` attribute. The newer one (`/js/pa-<id>.js`) has the site baked
into the file — it contains no `data-domain` handling at all — and counts
nothing until `plausible.init()` is called. Our loader was written for the
first and given the second: it downloaded the script, set an attribute the
script ignores, and never called `init()`. Not one event was ever sent.

**It was invisible to Plausible's own checker.** The script was injected by
JavaScript at runtime, so it never appeared in the page source — which is
exactly where Plausible's verifier looks, and why the dashboard said "setup
pending" and would have said so forever.

The snippet is now rendered server-side into `<head>`, verbatim. Verified on
production: the `<script async src=…pa-…js>` tag and the `plausible.init()`
call are both in the raw HTML, the script returns 200, and no CSP blocks it.

**Everything is set:** `PUBLIC_PLAUSIBLE_DOMAIN`, `PUBLIC_PLAUSIBLE_SRC`,
`PLAUSIBLE_API_KEY` and `PLAUSIBLE_SHARED_LINK` are all in Vercel production.
The embedded dashboard lives at `/admin/bezoek`.

> **For the lawyers — this changed the cookie banner.** Plausible now runs for
> every visitor rather than waiting for consent, and the **Statistics** category
> has been removed from the banner to match. Those two go together: a toggle
> that gates nothing is theatre, and a gate with no toggle never opens. The
> position is defensible — Plausible sets no cookies, stores nothing on the
> device and anonymises IPs, so under GDPR/ePrivacy it generally needs no
> consent — but it is a change to what the banner promises, so it belongs in
> the §5 review. If they want it gated again, both halves reverse together;
> the note is in `consent.js` and `analytics.js`.

---

## 7. Page fidelity — 82.0%, and most of the rest should stay

**Priority: low. Cosmetic, and partly deliberate.**

Measured against production, not localhost. Two earlier numbers in this file
were wrong for the same reason: the measuring script stripped Svelte's dev-mode
`s-XXXX` scope classes but not production's `svelte-XXXX`, which understated
every production page.

| Page | Match |
|---|---|
| contact.html | 91% |
| privacy.html | 87% |
| index.html | 86% |
| over.html | 85% |
| hosted-experiences.html | 85% |
| journal.html | 83% |
| events.html | 81% |
| samenwerken.html | 77% |
| media.html | 76% |
| social-impact.html | 64% |

Two production-only gaps were found and closed since the last measurement:

- **`#voor-jou` had lost its six route cards.** The homepage rendered
  `<div class="routes">` empty. The row had been seeded before the step-card
  extractor was fixed, so its items were never lifted. Repaired with
  `npm run seed:pages -- --repair-rows`, which fills only lists that are empty
  in the database and non-empty in the HTML — an empty list holds no edit, so
  nothing anyone typed can be lost. A sweep found 21 empty lists in all; the
  other 20 are empty in the source HTML too and are not defects.
- **Six journal posts existed only as markup.** See below.

**Roughly half of what is left is the CMS being correct, not wrong:**

- **Consent gates.** `over.html` shows 8 expert cards; yours shows 0, because
  nobody has confirmed. Media shows 4 clips; yours shows none. Item §4 closes
  most of this.
- **Deliberate improvements.** The CMS renders `<picture>` where the static site
  has a bare `<img>` (that is the mobile work — 1.5 MB → 176 KB on the
  homepage), and real links where the static has dead `<article>` cards.

**What is genuinely unfinished** is a handful of bespoke blocks on
social-impact and media. Say the word and I will take them, but tick the
consent boxes first — that moves more, for less work.

### The journal — 49% → 83%

`journal.html` shows ten posts. The handoff shipped four as Markdown; the other
six were never written — their cards say *"door IMPACT aan te leveren"* — so
they existed as a card and nothing else, and the CMS site showed four where the
old site showed ten.

The six are now in the database with everything their card states and an **empty
body for IMPACT to write** in the backoffice. The article page renders fine
without one: hero, image, date, related event, no prose. Nothing was invented —
no titles, no copy, no images.

Dates were the one field the cards do not carry, and `published_at` is required
because it orders the feed. Each missing post was given a date interpolated from
its neighbours on the page, which keeps the six in the page's order and leaves
the four handoff dates untouched.

> **This does not reproduce the page's exact card sequence, and cannot.** The
> static grid runs oldest-first and features its *oldest* post; the CMS is a
> newest-first feed. The four handoff posts already rendered in the reverse of
> the static page before any of this. Matching exactly would mean rewriting the
> handoff's own dates — a small change, but not one to make unasked.

### The English journal is empty

`site/en/journal.html` exists, but the `journal` table has **10 Dutch rows and
zero English ones**, so the English journal falls back to the Dutch titles. The
page-level English copy was lifted from `site/en` at seed time; the journal was
not, because it is seeded from Markdown rather than from HTML. Not yet done.

---

## 8. Known limitations, recorded rather than fixed

Neither is a bug; both are decisions worth not reversing by accident.

**The whole deploy is `noindex`.** This app renders the same marketing pages
that are live on Netlify. Two indexed copies would compete as duplicates, with
the Vercel one able to outrank the real site. When this becomes the canonical
site rather than shadowing it, remove the meta tag in `src/app.html` and use the
`pages` table's per-page `robots` field instead.

**Translations are one record per language, not paired.** `05-DESIGN-SYSTEM.md`
says this is the one thing worth improving if you touch the model. It was left
alone so the seed stays a faithful copy of the source content.

---

## Suggested order

1. **§3** — confirm the Supabase Site URL saved. One glance.
2. **§4** — tick the figures, experts and clip consent where the answers are
   yes. **This is the biggest visible change left**, it needs no deploy, and it
   is what makes three empty blocks fill in. Still 0 of 6 figures, 0 of 3
   experts, 0 of 4 clips.
3. **§5** — send the privacy text to your lawyers, including the Plausible
   consent change in §6. The long pole; start it early even though it finishes
   late.
4. **§7** — the English journal, then the remaining bespoke blocks. Last,
   because most of the rest should not change.

§1, §2 and §6 are done.

---

## Not in the numbered list

**Nothing is committed to git.** The changes from the Plausible and journal work
are on disk only: `analytics.js`, `consent.js`, `SiteShell.svelte`,
`seed-pages.ts` (new `--repair-rows` mode) and a new `scripts/journal-cards.ts`.
Two things are in the way — the `D:\` drive is itself a git repository, so a
`git` command run from the wrong directory operates on the drive root rather
than this project; and the credential manager authenticates as `Lathif21`
against `LathifSihab/impact-cms`, so pushes are rejected. Clearing it with
`cmdkey /delete:git:https://github.com` and pushing again is the fix.

**`npm run build` fails on Windows** with `EPERM: operation not permitted,
symlink` from the Vercel adapter. It needs Developer Mode or an elevated shell
to create symlinks. Harmless — Vercel builds on Linux, and the Vite compile
itself succeeds — but it means the production build cannot be smoke-tested
locally.

**Three signup rows are in the database**, all with `brevo_ok: true`. If those
are the test submissions rather than real people, they are worth clearing before
handover so `/admin/signalen` starts from zero.
