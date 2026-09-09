# Testing the IMPACT backoffice end to end

Every check below was run against a live local stack on 9 September 2026 and
passed. They are written so you can repeat them and see the same thing, not so
they can be recited.

Two kinds of check: **A. by hand in a browser**, which is what you want before a
demo, and **B. over HTTP**, which is faster and catches the things a click-through
misses. Do A if you have ten minutes; do B if you have three.

---

## 0. Get it running

You need Docker running, Node 20+, and the Supabase CLI.

```bash
cd cms
npm install
```

### The content

The client's real content is **not in this repository**. It lives in the handoff
folder as `reference/content/` — four events, four journal posts, and the full
set of partners, experts, formats, foundations, age groups, tiers and figures.

If this repo sits inside the handoff folder, the seed finds it. Otherwise point
at it:

```bash
export IMPACT_CONTENT_DIR=/path/to/handoff/reference/content
```

The seed refuses to run rather than inventing anything, and says where it looked.

### The database

```bash
supabase start          # first run pulls containers; takes a few minutes
supabase status         # prints the URLs and keys used below
```

The ports are deliberately not the defaults (54361 API, 54362 db, 54363 Studio),
because another local Supabase project may already hold 54321–54327.

```bash
npm run env:local       # writes .env from the running stack
```

**Do not `cp .env.example .env`.** The template has empty values, so the copy
configures you with nothing, and running it over a working `.env` wipes it. The
symptom either way is `Your project's URL and Key are required to create a
Supabase client` on every page, plus both scripts refusing to run.

Leave `BREVO_API_KEY` and `TICKET_TAILOR_API_KEY` empty — step 9 checks what
happens when they are missing, which is the interesting case.

`.env` is read when the dev server **starts**. If you change it, restart
`npm run dev` or nothing happens.

```bash
npm run seed
npm run user:create -- demo@wemakeimpact.be 'backoffice-demo-2026'
npm run dev
```

**Expected seed output** — these numbers are the source files, so a difference is
a real difference:

```
  formats              5
  foundations          6
  age_groups           3
  tiers                4
  experts              3
  partners             9
  figures              6
  events               4
  events_foundations   6
  events_experts       3
  events_partners      0
  journal              4
  testimonials         0  (leeg op dossier — geen toestemming)
```

`testimonials 0` is correct and must stay 0. No parental consent is held, so
there is nothing to seed. If you ever see a number there, someone invented
quotes.

The app is on **http://localhost:5273**.

### Two things get called "the dashboard"

| What | Where | Login |
|---|---|---|
| **The public site** — `/events` and `/journal`, rendered live from the database. What a visitor sees. | http://localhost:5273/ and `/en` | none |
| **The backoffice dashboard** — tiles and the consent list. What the client edits. | `http://localhost:5273/admin` | `demo@wemakeimpact.be` / `backoffice-demo-2026` |
| **Supabase Studio** — the database admin UI from the local stack. For checking a write landed. | http://127.0.0.1:54363 | none, locally |

Everything in section A below is the **backoffice**, now at `/admin`. Section E
covers the public pages. Anything under `/admin` redirects to `/login` when
signed out; everything else is public by design.

If `npm run dev` prints a port other than 5273, something else already holds it
(often an earlier `npm run dev` you did not stop). Use the port it prints, or
free 5273 first.

### Supabase Studio, briefly

Open http://127.0.0.1:54363 and pick the **Table Editor**. You should see the
ten content tables plus the three `events_*` join tables. Two things it is good
for:

- **Confirming a write really landed.** Edit an event in the CMS, then look at
  the row here. A green "Bewaard." is the app telling you it succeeded; this is
  the far side actually saying so, which is the distinction this project keeps
  paying for.
- **Seeing the join tables.** `events_foundations`, `events_experts` and
  `events_partners` carry a `position` column, which is the order the picker
  put them in. Nothing in the CMS shows you those rows directly.

The **SQL Editor** runs the same queries used in section B if you would rather
not use `docker exec`.

Do not use Studio to edit content during a demo. It bypasses every validation
rule and every consent gate in the CMS — including the ones that stop a real
person's name being published — because it writes to Postgres directly as an
admin. It is a diagnostic tool, not a second backoffice.

---

# A. By hand, in a browser

## 1. You cannot get in without logging in

Open http://localhost:5273/admin in a private window.

- [ ] You land on `/login?next=%2Fadmin`, not on the dashboard.
- [ ] Try http://localhost:5273/admin/content/events directly — same redirect,
      with `next=%2Fadmin%2Fcontent%2Fevents`.
- [ ] The login page does **not** show a red "Niet geconfigureerd" box. If it
      does, `.env` is missing or wrong, and nothing below will work.

## 2. Login

- [ ] Wrong password → "Deze combinatie klopt niet." It does not say whether the
      account exists; that difference would tell an attacker which addresses are
      staff.
- [ ] Right password (`demo@wemakeimpact.be` / `backoffice-demo-2026`) → the
      dashboard.
- [ ] Going back to `/login` while signed in bounces you to the dashboard.

## 3. The dashboard tells the truth

- [ ] Four tiles: **4** events, **3** met wachtlijst, **0** inschrijvingen open,
      **9** wacht op toestemming. The last tile is red.
- [ ] "Wacht op toestemming" lists nine records: three experts by name and six
      figures. This is the point of the screen — those records exist but publish
      nowhere.
- [ ] "Laatst bewerkt" shows recent records across types with Dutch dates.

## 4. Events — the demo centrepiece

Go to **Events** in the sidebar, then open *IMPACT Camp — Basketball Edition 2027*.

- [ ] The list shows 4 events with status badges: three "Wachtlijst open", one
      "Voorbij" in grey.
- [ ] On the edit page, fields are grouped (Editie, Wanneer & waar, Deelname,
      Tekst, Beeld, Programma, Verbanden, Praktisch, SEO).
- [ ] **Galerij** has 3 rows, each with Pad and Alt-tekst, numbered 01–03, with
      ↑ ↓ × buttons. ↑ is disabled on the first row, ↓ on the last.
- [ ] **Programma** has 5 day rows.
- [ ] **Fundamenten** has all six ticked; **Experts & coaches** has three ticked,
      each marked "niet bevestigd" in red; **Partners** has none ticked.
- [ ] **SEO** shows a filled paginatitel and omschrijving — not empty boxes.
      (An empty SEO block here is the specific bug fixed on 9 September: it was
      serialising as `{}` on the server.)

Now change something:

- [ ] Set **Status** to "Inschrijvingen open", add a Praktisch row, untick one
      expert, tick one partner, press **Bewaren**.
- [ ] A green "Bewaard." appears. Reload the page — every change survived,
      including which expert is gone and which partner is now ticked.
- [ ] Go back to the dashboard: "Inschrijvingen open" is now **1** and
      "Met wachtlijst" is **2**.
- [ ] Set it back to "Wachtlijst open" when you are done, or re-run
      `npm run seed -- --reset`.

## 5. Validation says no, in Dutch, and loses nothing

On any event:

- [ ] Clear **Titel** → save → red "Dit veld is verplicht." under the field, and
      a banner saying nothing was saved.
- [ ] Set **Leeftijd van** 18 and **Leeftijd tot** 8 → "De bovengrens moet groter
      zijn dan de ondergrens."
- [ ] Set **Einddatum** before **Startdatum** → "De einddatum ligt voor de
      startdatum."
- [ ] Type letters into **Capaciteit** → "Vul een geldig getal in."
- [ ] After a failed save, **your other typing is still in the form.** You do not
      lose the paragraph you just wrote to a wrong date.
- [ ] Reload the page — none of the invalid values were written.

## 6. The consent gate

Open **Experts → Julie Dingemans**.

- [ ] At the bottom is a bordered block, not an ordinary checkbox. It reads
      "Publiceert niet" in red and explains what the tick means.
- [ ] The list view marks the row "niet gepubliceerd".
- [ ] Tick it and save → the block turns green and reads "Publiceert". The
      dashboard's "Wacht op toestemming" count drops from 9 to 8.
- [ ] Untick and save → back to 9.

Then **Testimonials**:

- [ ] The list is empty, and the empty state says so on purpose: no written
      consent is on file, and it should not be filled with invented quotes.

## 7. Creating and deleting

- [ ] **Journal → Nieuw artikel.** Type a title — the Id (slug) fills itself in
      as you type.
- [ ] Edit the Id by hand, then keep typing the title — the Id stops following.
      It is a suggestion, not a rule.
- [ ] Try to save with an Id like `Niet Geldig!` → "Gebruik alleen kleine
      letters, cijfers en koppeltekens."
- [ ] Save a valid one → you land on its edit page with "Aangemaakt."
- [ ] Create another with the same Id → "Er bestaat al een record met dit id."
- [ ] On the edit page, **Verwijderen** asks "Zeker weten?" before it does
      anything. Confirm → back to the list, record gone.
- [ ] **Foundations** and **Leeftijdsgroepen** have no "Nieuw" button — they are
      fixed sets. `/admin/content/foundations/new` returns 403 if you type it in.

## 8. All ten types load

Click every item in the sidebar. Each should show a count in the nav and a
populated list:

- [ ] Events 4 · Journal 4 · Partners 9 · Experts 3 · Cijfers 6 · Partnerniveaus 4
      · Formats 5 · Fundamenten 6 · Leeftijdsgroepen 3 · Testimonials 0

## 9. Signalen degrades honestly

Go to **/admin/signalen** with no API keys set.

- [ ] Two red notices: "Brevo niet gelezen" and "Ticket Tailor niet gelezen",
      each naming the missing variable and reminding you a new value only counts
      after a new deploy.
- [ ] The per-editie table still renders the four editions from the database,
      with 0 signups and "geen event".
- [ ] It does **not** show an empty table that looks like "no signups". That
      difference is the whole point — this project lost a day to a failure that
      looked like a success.

If you do have keys, put them in `.env`, restart `npm run dev`, and the tiles and
attribution table fill in.

## 10. It survives a phone

- [ ] Narrow the window to 390px. The sidebar stacks above the content, list rows
      collapse to one column, and nothing scrolls sideways.

## 11. Sign out

- [ ] **Uitloggen** returns you to the login page, and the back button does not
      get you back into the dashboard.

---

# B. Over HTTP

Faster, and it checks things a browser click-through does not — that the server
rejects what it should, and that writes actually reach Postgres.

Requires `curl`. `Origin` is needed because SvelteKit rejects cross-origin POSTs.

```bash
BASE=http://localhost:5273
cd /tmp && rm -f jar.txt
```

### Auth guard

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $BASE/admin
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $BASE/admin/content/events
```

Expect `303 .../login?next=%2Fadmin` and `303 .../login?next=%2Fadmin%2Fcontent%2Fevents`.

### Login

```bash
curl -s -c jar.txt -b jar.txt -X POST $BASE/login -H "Origin: $BASE" \
  --data-urlencode "email=demo@wemakeimpact.be" \
  --data-urlencode "password=wrong" --data-urlencode "next=/admin" | head -c 120
```

Expect a `401` failure carrying "Deze combinatie klopt niet.". Then:

```bash
curl -s -c jar.txt -b jar.txt -X POST $BASE/login -H "Origin: $BASE" \
  --data-urlencode "email=demo@wemakeimpact.be" \
  --data-urlencode "password=backoffice-demo-2026" --data-urlencode "next=/admin"
```

Expect `{"type":"redirect","status":303,"location":"/admin"}`.

### Every list view answers

```bash
for c in events journal partners experts figures tiers formats foundations age_groups testimonials; do
  printf "%-14s " "$c"
  curl -s -b jar.txt -o /tmp/l.html -w "%{http_code}  " $BASE/admin/content/$c
  grep -oE "[0-9]+ van [0-9]+|Leeg \]" /tmp/l.html | head -1
done
```

Expect `200` for all ten, with `4 van 4`, `4 van 4`, `9 van 9`, `3 van 3`,
`6 van 6`, `4 van 4`, `5 van 5`, `6 van 6`, `3 van 3`, and `Leeg ]` for
testimonials.

### Error cases

```bash
curl -s -b jar.txt -o /dev/null -w "new on fixed set: %{http_code}\n" $BASE/admin/content/foundations/new
curl -s -b jar.txt -o /dev/null -w "unknown type:     %{http_code}\n" $BASE/admin/content/nope
curl -s -b jar.txt -o /dev/null -w "unknown record:   %{http_code}\n" $BASE/admin/content/events/nope
```

Expect `403`, `404`, `404`.

### A real write, verified on the far side

Save an event with changed relationships:

```bash
curl -s -b jar.txt -X POST "$BASE/admin/content/events/camp-basketball-edition-2027?/save" \
 -H "Origin: $BASE" \
 --data-urlencode "title=IMPACT Camp — Basketball Edition 2027" \
 --data-urlencode "format_id=camps" --data-urlencode "edition_year=2027" \
 --data-urlencode "status=open" --data-urlencode "locale=nl" \
 --data-urlencode "date_text=Juli 2027" \
 --data-urlencode "date_start=2027-07-05" --data-urlencode "date_end=2027-07-09" \
 --data-urlencode "location=Antwerpen" \
 --data-urlencode "age_min=8" --data-urlencode "age_max=14" \
 --data-urlencode "standfirst=Basketbal is het medium." \
 --data-urlencode "intro=Het medium creëert een context." \
 --data-urlencode "hero_image=assets/img/court-169.jpg" \
 --data-urlencode 'foundations=["resilience","ownership"]' \
 --data-urlencode 'experts=["olivier-goetgeluck","julie-dingemans"]' \
 --data-urlencode 'partners=["decathlon"]' \
 --data-urlencode 'practical=[{"k":"Status","v":"Inschrijvingen open"}]' \
 --data-urlencode 'seo={"title":"Camp 2027 | Open","description":"Inschrijvingen open."}'
```

Expect `{"type":"success",...,"saved":1...}`. **Now check the database, not the
response code** — a 200 from your own endpoint is not proof that anything was
stored, which is a lesson this project paid for:

```bash
docker exec supabase_db_cms psql -U postgres -d postgres \
  -c "select id,status,date_start,seo->>'title' from events where id='camp-basketball-edition-2027';" \
  -c "select foundation_id,position from events_foundations where event_id='camp-basketball-edition-2027' order by position;" \
  -c "select expert_id,position from events_experts where event_id='camp-basketball-edition-2027' order by position;" \
  -c "select partner_id from events_partners where event_id='camp-basketball-edition-2027';"
```

Expect status `open`, the dates, the new SEO title, exactly two foundations at
positions 0 and 1, two experts with `olivier-goetgeluck` **first** (the order you
sent, not alphabetical), and one partner. The join tables are replaced wholesale,
so the four relationships that were there before are gone.

### Validation rejects and writes nothing

```bash
curl -s -b jar.txt -X POST "$BASE/admin/content/events/camp-basketball-edition-2027?/save" \
 -H "Origin: $BASE" \
 --data-urlencode "title=" --data-urlencode "format_id=camps" \
 --data-urlencode "edition_year=2027" --data-urlencode "status=open" \
 --data-urlencode "locale=nl" --data-urlencode "date_text=Juli 2027" \
 --data-urlencode "date_start=2027-07-09" --data-urlencode "date_end=2027-07-05" \
 --data-urlencode "location=Antwerpen" \
 --data-urlencode "age_min=18" --data-urlencode "age_max=8" \
 --data-urlencode "standfirst=x" --data-urlencode "intro=y" \
 --data-urlencode "hero_image=a.jpg" --data-urlencode "capacity=twintig"
```

Expect a `400` carrying all four messages: "Dit veld is verplicht.", "Vul een
geldig getal in.", "De bovengrens moet groter zijn dan de ondergrens.", "De
einddatum ligt voor de startdatum." Then confirm the row is untouched:

```bash
docker exec supabase_db_cms psql -U postgres -d postgres \
  -tAc "select title, age_min, age_max from events where id='camp-basketball-edition-2027';"
```

### Restore

```bash
cd cms && npm run seed -- --reset
```

---

# C. Security — the checks that matter most

This system holds children's first names and ages on the site side, and named
adults who have not consented to publication on this side. These four are worth
re-running after any change to auth or RLS.

`ANON` is the `ANON_KEY` from `supabase status`; `API` is the API URL.

```bash
API=http://127.0.0.1:54361
ANON=<paste ANON_KEY>
```

**1. Anonymous reads are gated by consent, not blocked outright.** The public
site has to read content, so `anon` now has SELECT — but the policies filter the
three tables that name real people or make public claims.

```bash
# public content: rows expected
curl -s "$API/rest/v1/events?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# gated: must be [] while every row is unconfirmed
curl -s "$API/rest/v1/experts?select=id,confirmed" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -s "$API/rest/v1/figures?select=id,confirmed" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -s "$API/rest/v1/testimonials?select=id"      -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

Events come back. The other three return `[]` — **an unconfirmed name reaching
anon is the most serious failure this system can have.** Tick `confirmed` on one
expert in the backoffice and re-run: exactly that one appears, and no other.

**2. Anonymous cannot write.**

```bash
curl -s -X POST "$API/rest/v1/testimonials" -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"id":"x","quote":"q","attribution":"a","edition":"e","consent_on_file":true}'
```

Expect `42501 permission denied`.

**3. There is no self-registration.**

```bash
curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"intruder@example.com","password":"aVeryLongPassword1"}'
```

Expect `{"code":422,"error_code":"signup_disabled",...}`. Accounts are made
deliberately with `npm run user:create`.

**4. The service-role key is not in the app.**

```bash
grep -rn "SERVICE_ROLE" src/ || echo "not referenced in src/ — correct"
```

It belongs to the two scripts only. The app runs on the anon key with RLS.

---

# D. Build

```bash
npm run check                  # 0 errors, 0 warnings
npm run build                  # Vercel target
ADAPTER=node npm run build     # plain Node server
```

On Windows without Developer Mode the Vercel adapter fails on symlinks
(`EPERM ... symlink`). That is the environment, not the code — use the `node`
adapter locally and let Vercel do the Vercel build.

---

# E. Page configuration

`/admin/pages` — the eight prose pages. Seed them first:

```bash
npm run seed:pages
```

Expect 9, 7, 8, 6, 4, 4, 2 and 1 sections, with two blocks reported as not
recognised. Those are bespoke markup with no section type; they are listed
rather than mangled.

- [ ] `/admin/pages` lists all eight with their slug, hero title, section count
      and Live/Concept badge.
- [ ] Open **Over IMPACT.** The sections are collapsed accordions showing type,
      heading and background — the page's outline at a glance.
- [ ] Expand one. It has the fields for its type, plus Background and Anchor.
- [ ] Reorder with ↑ ↓, delete with ×, and **+ Sectie toevoegen** offers the
      seven types with a line on each.
- [ ] Upload a hero image: JPEG/PNG/WebP, preview appears before saving, a
      non-image is refused.
- [ ] **Wijzigingen bewaren** → "Bewaard.", then open `/over` in a new tab and
      the change is there. No rebuild.
- [ ] Add a **Inhoud uit een type** section, source Fundamenten. The six
      foundations render on the public page — pulled from the content type, not
      retyped.
- [ ] Untick **Zichtbaar op de site** and save. `/media` returns 404 to a
      visitor while staying editable in the backoffice.

Enforced in the database, not the route:

```bash
# a draft is invisible to anon
curl -s "$API/rest/v1/pages?select=id&id=eq.privacy" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# and anon cannot write pages at all
curl -s -X POST "$API/rest/v1/pages" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"   -H "Content-Type: application/json" -d '{"id":"x","nav_label":"x"}'
```

Expect `[]` for the first while it is unpublished, and `42501` for the second.

---

# E2. The rendered public site

These pages come out of the database, so this is where you prove the loop the
brief actually asked for: change content, reload, see it.

## Every edition has its own page

The static site cannot do this. `site/event.html` is one hardcoded page for
Basketball Edition 2027, and all nine links on its events list point at it.

```bash
for s in camp-basketball-edition-2027 camp-basketball-edition-2026 \
         day-brussels-2027 retreat-student-entrepreneurs; do
  printf "%-32s " "$s"
  curl -s "http://localhost:5273/events/$s" | grep -oE "<title>[^<]*</title>"
done
```

Four different titles. Each page is its own row.

## It looks like the real site

The pages are the static site's markup with the lists swapped for database
reads, so this is a visual comparison, not a code one.

- [ ] Open http://localhost:5273/events beside
      https://demo-impact-c399e3.netlify.app/events.html — same hero, same
      `event-row` list, same black format strip, same alternating format
      sections, same overview table, same CTA cards.
- [ ] Same for `/journal` against `.../journal.html`: hero, feature, filter
      chips, `jcard` grid, news band.
- [ ] `/events/<slug>` against `.../event.html`: hero pills and kicker, the
      metabar, the two-column body with a sticky sidebar, programme day rows,
      foundation grid, FAQ accordions, practical table.
- [ ] The nav is the real one: hover a top-level item and the dropdown opens;
      narrow the window and the burger opens the mobile menu.
- [ ] Scroll — the nav compacts past 50px and sections fade in.
- [ ] Wait for the newsletter popup, or move the pointer off the top of the
      window to trigger it. It must close on the ×, on a backdrop click and on
      Escape — **and the rest of the page must be clickable again afterwards.**

That last clause is the real test. While the dome is open, `main.js` makes the
page inert by marking every child of `<body>` except the dome. If anything
wraps the page, that wrapper is the child being marked and it contains the dome,
so the popup and the cookie button and everything else stop responding. This is
why `src/app.html` renders `%sveltekit.body%` directly rather than inside
SvelteKit's usual `display:contents` div.

Those last two broke once and have a regression test now:

```bash
npm run dev                                    # in one terminal
npm run test:behaviour                         # defaults to /events
npm run test:behaviour -- http://localhost:5273/journal
```

It loads the served page into jsdom, runs the site's own scripts and asserts
the dome closes and `[data-reveal]` elements receive `.is-in`. Both failed when
the scripts were loaded from `<svelte:head>`, because that runs them before
hydration and their listeners were bound to nodes Svelte then replaced.
- [ ] The journal filter chips actually filter the grid. That is the static
      site's own `main.js` working on transcribed `data-cat` attributes.
- [ ] Over, Samenwerken, Contact and Privacy in the nav go to the deployed
      static site, not to a 404 here.

**Images are the visible gap.** `static/assets/` ships brand, css and js;
`assets/img` and `assets/video` are gitignored, so photography slots are empty
until you copy those folders in from the original repo.

## Both languages, from one set of files

- [ ] http://localhost:5273/events — Dutch: "Wachtlijst open", "Praktisch"
- [ ] http://localhost:5273/en/events — English chrome: "Waiting list open"
- [ ] The language link keeps your place: `/en/events/<slug>` ↔ `/events/<slug>`
- [ ] Content itself stays Dutch on the English pages. That is the fallback
      working, not a bug — the model stores one row per language and none of the
      seeded rows are English.

## An edit appears with no rebuild

- [ ] Open an event in `/admin`, change **Datum in tekst** and **Status**, save.
- [ ] Reload http://localhost:5273/events — the new date and status are there.
- [ ] Compare with the static copy on :8080, which is unchanged because nothing
      rebuilt it. That contrast is the demo.

## Status drives the page, not just a label

- [ ] `waitlist` → the waiting-list form, including the guardian consent tick
- [ ] `open` → the box office link (needs `PUBLIC_TICKET_TAILOR_BOX_OFFICE`)
- [ ] `full` / `past` → neither

Without `PUBLIC_SUBSCRIBE_ENDPOINT` the form is replaced by a line saying it is
not connected, rather than posting into nowhere.

## The consent gate holds in public

The important one.

- [ ] All three experts start unconfirmed. On
      `/events/camp-basketball-edition-2027`, no expert names appear anywhere.
- [ ] Tick `confirmed` on **Julie Dingemans** in `/admin`, reload the public
      page: her name appears, the other two still do not.
- [ ] Untick it: gone again.

Enforced by the RLS policy, not by the template. A page that forgot to filter
still could not render an unapproved name.

## Images

Image fields are uploads. Files land in `cms/uploads/<table>/<record-id>/`.

Run the migration once after seeding:

```bash
npm run images:migrate
```

Expect `9 gekopieerd, 7 al in orde, 27 niet gevonden`. The nine are the partner
logos, which are in the handoff. The 27 are the photography, which is not — those
paths are listed and left untouched rather than blanked, so you can still see
what a record wanted. Point `--source` at the original repo to finish the job.

- [ ] After migrating, `/admin/content/partners/boshi` shows the logo as a
      thumbnail, not a path in a text box.
- [ ] `uploads/partners/boshi/` contains one file named `logo-<hash>.png`.
- [ ] Upload a new image on an event: the preview appears immediately, before
      saving, and says "nog niet bewaard".
- [ ] Save, then check `uploads/events/<slug>/` — the file is there and the
      public page shows it.
- [ ] Replace it. The old file is **deleted**, not left behind.
- [ ] Delete the record. Its whole folder goes with it.
- [ ] An event whose photo is still a legacy path shows "oud pad uit de
      statische site" rather than a silently broken image.

### The upload checks that matter

```bash
# a text file renamed .png must be refused — type comes from the magic number,
# not from the Content-Type the client claims
printf 'not an image' > fake.png
curl -s -b jar.txt -X POST "$BASE/admin/content/partners/boshi?/save" \
  -F "name=Boshi" -F "url=https://example.com" -F "logo=" \
  -F "logo__file=@fake.png;type=image/png"
```

Expect `"Alleen JPG, PNG, WebP, AVIF of GIF."`

```bash
# path traversal on the serving route
for p in "../../../.env" "..%2f..%2f..%2f.env" "partners/../../../package.json"; do
  curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "$BASE/uploads/$p"
done
```

Expect `404` for all three.

**On Git Bash, export `MSYS_NO_PATHCONV=1` before these.** It rewrites a leading
`/uploads/...` argument into `C:/Program Files/Git/uploads/...`, which makes the
orphan-cleanup test silently pass for the wrong reason — it cost time here.

---

# Viewing the public website locally

You can, and it is worth doing before a demo — but **the CMS does not feed it.**

## Serve it

The site is 24 static HTML files. The pages use relative asset paths, so the
document root needs `assets/` sitting next to the HTML:

```bash
cd /path/to/handoff
mkdir -p /tmp/site-preview
cp -r site/* /tmp/site-preview/
cp -r assets  /tmp/site-preview/assets
cd /tmp/site-preview && python -m http.server 8080
```

Dutch on http://127.0.0.1:8080/, English on http://127.0.0.1:8080/en/.

**Photography and video are missing** and the pages will render without them.
They are 17 MB and 19 MB and were left out of the handoff on purpose; the HTML
still points at `assets/img/...` and `assets/video/...`, so copy those across
from the original repo if you want the site to look finished.

## Why your CMS edits do not show up *here*

They do show up on the CMS-rendered pages (section E). They do **not** show up on
this static copy, and that is the scoping decision from 06-CMS-SCOPE.md:

> In the first pass, the CMS manages data. It does not serve the website.

The site is static HTML **committed to git**, generated locally by a Python
pipeline (`tools/build.py` in the original repo — not in this handoff) that reads
`reference/content/` and the hand-authored Dutch pages. There is no build step at
deploy time; Netlify publishes `site/` as-is.

You can see the gap for yourself:

```bash
grep -n "Juli 2027" site/events.html
```

The date is hardcoded at lines 196 and 394. And nothing in `site/` mentions
Supabase or the CMS at all:

```bash
grep -rlE "supabase|localhost:5273" site/    # no matches
```

So the two systems currently share their content only by both having been built
from the same `reference/content/` files. Change an event in the CMS and the
database changes; the website does not.

**Say this out loud in the demo.** "A working backoffice with real data in a real
database, not yet the thing that publishes the site" is an impressive sentence.
Letting the client assume otherwise becomes a problem in week three.

## What is left

Events and Journal are rendered by the CMS now — section E. The remaining prose
pages (home, Over, Contact, Samenwerken, Social Impact, Media, Hosted
Experiences, Privacy) are still this static build, and their copy is
hand-authored with no content type behind it. Moving those means either adding
content types the data model deliberately omits, or keeping them static and
serving the two halves from one domain.

# What these tests do not cover

Being straight about the edges, so nobody mistakes a green run for more than it is:

- **No automated suite.** These are manual and curl-driven. There is no
  Playwright or Vitest here yet.
- **Not tested against hosted Supabase**, only a local stack. The difference that
  bites is environment variables: on Vercel a changed value does nothing until a
  new deploy.
- **Signalen has not been tested against live Brevo or Ticket Tailor** — only the
  no-keys path. Ticket Tailor's `/v1/events` currently returns an empty list
  anyway, because the client has not entered any events.
- **No visual regression testing.** Step 10 is an eyeball check.
- **The CMS does not publish the site**, so there is nothing to test there. That
  is phase two.
