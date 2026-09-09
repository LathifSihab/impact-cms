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
| Dashboard tiers 1–4 | live; Plausible's half waits on a key (§6) |
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

## 2. The box office link — **not urgent, and here is why**

**Priority: low.** It changes nothing today.

`PUBLIC_TICKET_TAILOR_BOX_OFFICE` is empty. But the link it fills only renders
for an edition whose status is `open`:

```svelte
{:else if e.status === 'open' && data.boxOffice}
```

Your four editions are `waitlist`, `past`, `waitlist`, `waitlist`. **None are
open**, so the link has nowhere to appear. And Ticket Tailor's API returns zero
events — nothing has been entered there yet, so a box office link would lead to
an empty storefront.

### When it starts to matter

The moment you set an edition to **Inschrijvingen open** in the backoffice. Do
these together:

1. Enter the event in **Ticket Tailor** and publish it.
2. Set the variable (below).
3. Change the edition's status to `open` in `/admin/content/events`.

Doing 3 before 1 and 2 gives visitors a button to an empty shop.

### Where to find the value

It is not in the API — I checked, there is no `box_offices` endpoint on this
plan. Get it from the dashboard:

**Ticket Tailor → Box office → Settings**, or open your public box office and
copy the address. It looks like:

```
https://www.tickettailor.com/o/<your-account-slug>
```

Do **not** paste Ticket Tailor's embed snippet. It hardcodes the account id and
a ref, which would put an account identifier in twenty files and make handover a
code change instead of editing a box in a UI. `04-INTEGRATIONS.md` is explicit
about this.

### Steps

```powershell
cd cms

vercel env add PUBLIC_TICKET_TAILOR_BOX_OFFICE production `
  --type config `
  --value "https://www.tickettailor.com/o/<your-slug>" `
  --force --yes

vercel deploy --prod --yes
```

### Verify

Set one edition to `open` in the backoffice, then open its page. The primary
button says **Bekijk tickets** and goes to your box office, not to
`tickettailor.com`'s front page.

---

## 3. Finish the Supabase auth setup

**Priority: high, and it takes one minute.**

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

## 6. Plausible traffic — built, and waiting on one key

**Priority: low. The dashboard works without it.**

Tier 4 is built. It has two halves, and only one of them needs anything from
you.

### The half that already works

**Attribution and conversion, from our own rows.** Since `/api/subscribe` came
in-house, every signup is recorded with the page, referrer and campaign it
arrived through. `/admin/signalen` now shows:

- signups over 90 days, split newsletter and waiting list
- which campaign produced them
- which page they landed on
- which site referred them
- the last ten, with their edition and language
- **how many reached us but not Brevo** — those are not lost, they are sitting
  in the table waiting to be replayed, and without a count nobody would look

That is the brief's *"which campaign/page/waitlist drove each signup"*, answered
from our own data rather than inferred from a traffic tool. No key, no plan, no
external dependency.

### The half that needs a key

**Visitor counts from Plausible.** The panel currently says:

> Nog niet gekoppeld. Zet PLAUSIBLE_API_KEY en PUBLIC_PLAUSIBLE_DOMAIN om
> bezoekcijfers te tonen.

To connect it:

1. Plausible → your site → **Settings → API keys** → create a key.
2. Then:

```powershell
cd cms
vercel env add PLAUSIBLE_API_KEY production --type secret --value "<key>" --force --yes
vercel env add PUBLIC_PLAUSIBLE_DOMAIN production --type config --value "<your-site-domain>" --force --yes
vercel deploy --prod --yes
```

The domain is the site name as Plausible knows it, not a URL — e.g.
`demo-impact-c399e3.netlify.app`.

**The Stats API is plan-gated.** If it is not on your plan, the panel says so
specifically rather than showing an empty chart — "Plausible geeft geen toegang
tot de Stats API". Upgrading or linking out to the Plausible dashboard are both
reasonable answers; half a chart is not.

Once connected, the conversion figure appears too: their visitors over our
signups, which is a real ratio rather than two numbers from two systems that
count differently.

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

1. **§3** — Supabase Site URL. One minute.
2. **§1** — the waitlist endpoint. One command, one deploy, and the site becomes
   usable rather than a brochure.
3. **§4** — tick the figures and experts if the answers are yes. Two pages fill
   in, no deploy needed.
4. **§5** — send the privacy text to your lawyers. It is the long pole; start it
   early even though it finishes late.
5. **§6** — add the Plausible key if the Stats API is on your plan. The rest of
   that panel already works without it.
6. **§2** — the box office, when you have a real event in Ticket Tailor.
7. **§7** — the remaining fidelity, last, because most of it should not change.
