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
| Dashboard tiers 1–3 | live (content, Brevo, Ticket Tailor) |

What follows is what is *not* finished, ordered by what actually costs you
something today.

---

## 1. The waitlist form is not connected — **do this first**

**Priority: high.** This is the one thing a visitor can actually *do* on the
site, and right now it tells them it is unavailable.

### What is wrong

`PUBLIC_SUBSCRIBE_ENDPOINT` is empty, so every event page shows:

> Het wachtlijstformulier is op deze omgeving niet aangesloten.

That message exists so the form never posts into nowhere — a form that silently
swallows a signup is worse than one that admits it is off. But it means nobody
can join a waiting list.

### Why it is empty

The static site posts to `/.netlify/functions/subscribe` — a *relative* path,
which works because the form and the function are on the same Netlify origin.
The CMS is on Vercel, so it needs the absolute URL. There was no absolute URL to
copy, which is why the variable was never filled in.

### The value

```
https://demo-impact-c399e3.netlify.app/.netlify/functions/subscribe
```

I verified this endpoint is live and working:

- `GET` → `405` (it only accepts POST — correct)
- `POST` with no email → `422 {"ok":false,"errors":{"email":"Vul een geldig e-mailadres in."}}`

So it is up, validating, and reachable from outside Netlify.

### Steps

```powershell
cd cms

vercel env add PUBLIC_SUBSCRIBE_ENDPOINT production `
  --type config `
  --value "https://demo-impact-c399e3.netlify.app/.netlify/functions/subscribe" `
  --force --yes

vercel deploy --prod --yes
```

> **Use `--value`, never a pipe.** Piping into `vercel env add` from PowerShell
> prepends an invisible byte-order mark that becomes part of the value. It cost
> us a deploy already — see DEPLOYMENT.md's troubleshooting section.

### Verify

1. Open https://demo-impact-cms.vercel.app/events and click any edition.
2. The waiting-list form is there, with no "niet aangesloten" message.
3. Submit a real address of your own.
4. Brevo → Contacts → list **4 (Waitlist)**. Your address is there, with the
   attributes filled in: `EVENT`, `LOCALE`, `LANDING_PAGE`, `REFERRER`.
5. `/admin/signalen` shows the signup.

### If it does not work

The function is CORS-restricted to origins Netlify knows about. If the browser
console shows a CORS error, the function needs `https://demo-impact-cms.vercel.app`
added to its allowed origins — that is a change in the **static site's**
repository (`reference/subscribe.mjs` is the source), not here.

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

## 6. Plausible traffic panel — needs a plan check first

**Priority: low. Tell me the answer and I can build it.**

The dashboard has three of its four tiers live: content counts, Brevo signups,
Ticket Tailor sales. Tier 4 is traffic and conversion, and it is not built.

`08-DASHBOARD.md` flags the Plausible Stats API as **plan-gated** — it is not
available on every tier.

**What to check:** Plausible → your site → **Settings → API keys**. If you can
create a key, the Stats API is available.

- **If yes:** send me the answer and I will build the panel.
- **If no:** the honest options are to upgrade, or to link out to the Plausible
  dashboard from `/admin/signalen` instead of half-building a panel.

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
5. **§6** — check the Plausible plan and tell me.
6. **§2** — the box office, when you have a real event in Ticket Tailor.
7. **§7** — the remaining fidelity, last, because most of it should not change.
