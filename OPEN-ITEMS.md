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
| Dashboard tiers 1–4 | live; Plausible traffic waits on an API key (§6) |
| Analytics | tracking live behind the consent banner |
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

## 6. Plausible — tracking is live, the Stats API needs one key

**Tracking is wired and collecting.** This was broken in a way nobody would have
noticed: `analytics.js` is written to stay inert until a domain exists, and
nothing ever gave it one — no meta tag, and the script was not even in the
layout's load list. The site collected nothing, so a Stats API key would have
reported on an empty account.

Both meta tags are written from env now, and the script loads between
`consent.js` and `main.js` so the goal queue is installed before `main.js` fires
anything. It still waits for the **Statistics** category in the consent banner:
loading analytics after someone chose "Necessary only" would make the banner a
lie.

```
PUBLIC_PLAUSIBLE_DOMAIN = demo-impact-cms.vercel.app
PUBLIC_PLAUSIBLE_SRC    = https://plausible.io/js/pa-jko49HYqqZaXcl3mYEgRx.js
```

> Check your Plausible dashboard lists the site as
> `demo-impact-cms.vercel.app`. If it is registered under the Netlify domain
> instead, change `PUBLIC_PLAUSIBLE_DOMAIN` to match — Plausible drops events
> whose domain it does not recognise, silently.

**The dashboard's traffic panel still needs a separate credential.** The script
you pasted is the *tracking* side; the *reading* side is an API key:

1. Plausible → **Settings → API keys** → create one.
2. Then:

```powershell
cd cms
vercel env add PLAUSIBLE_API_KEY production --type secret --value "<key>" --force --yes
vercel deploy --prod --yes
```

The Stats API is plan-gated. If it is not on your plan the panel says so
specifically rather than showing an empty chart, and the attribution half of
that panel keeps working regardless — it reads our own rows, not Plausible.

---

## 7. Page fidelity — 84.7%, and most of the rest should stay

**Priority: low. Cosmetic, and partly deliberate.**

Markup fidelity against the original static pages:

| Page | Match |
|---|---|
| index.html | **100%** |
| contact.html | 91% |
| privacy.html | 87% |
| over.html | 85% |
| hosted-experiences.html | 84% |
| events.html | 82% |
| media.html | 76% |
| samenwerken.html | 77% |
| social-impact.html | 64% |
| journal.html | 51% |

**Roughly half the remaining gap is the CMS being correct, not wrong:**

- **Consent gates.** `over.html` shows 8 expert cards; yours shows 0, because
  nobody has confirmed. Media shows 4 clips; yours shows none. Items 4 above
  closes most of this.
- **Placeholder content.** `journal.html` has 9 cards against your 4 real posts —
  the extras say *"door IMPACT aan te leveren"*. `06-CMS-SCOPE` is explicit:
  do not invent placeholder content.
- **Deliberate improvements.** The CMS renders `<picture>` where the static site
  has a bare `<img>` (that is the mobile work — 1.5 MB → 176 KB on the
  homepage), and real links where the static has dead `<article>` cards.

**What is genuinely unfinished** is a handful of bespoke blocks on
social-impact and journal. Say the word and I will take them, but tick the
consent boxes first — that moves more, for less work.

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
   is what makes three empty blocks fill in.
3. **§5** — send the privacy text to your lawyers. The long pole; start it early
   even though it finishes late.
4. **§6** — add the Plausible API key if the Stats API is on your plan.
5. **§7** — the remaining fidelity, last, because most of it should not change.

§1 and §2 are done.
