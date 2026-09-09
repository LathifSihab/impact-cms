# Deploying the IMPACT backoffice

From nothing to a working deploy. Every step, in order, with what to check
before moving on.

The target is **Vercel** for the app and **Supabase** for the database, auth and
file storage — the stack `06-CMS-SCOPE.md` chose. The static marketing site stays
on Netlify and is not touched by any of this.

Budget about 45 minutes the first time. Most of it is waiting for Supabase to
provision and copying keys.

---

## Before you start

You need:

- A **Supabase** account, and permission to create a project
- A **Vercel** account, and permission to create a project
- The **repository** pushed to GitHub (it already is:
  `github.com/LathifSihab/impact-cms`)
- Node 22 or newer, and npm
- The client's content folder, if you are seeding: the handoff's
  `reference/content/`
- The photography, if you are migrating images: the handoff's `site/assets/`

You do **not** need Docker unless you also want to run Supabase locally.

### 0. Install the two CLIs first

Do this before anything else. Both are needed, and neither ships with Node.

```bash
npm i -g vercel
npm i -g supabase
```

Then check all of it in one go — **PowerShell**:

```powershell
foreach ($t in 'vercel','supabase','node','npm') {
  $c = Get-Command $t -ErrorAction SilentlyContinue
  if ($c) { "{0,-10} OK" -f $t } else { "{0,-10} MISSING" -f $t }
}
```

**bash / zsh**:

```bash
for t in vercel supabase node npm; do
  command -v "$t" >/dev/null && echo "$t OK" || echo "$t MISSING"
done
```

**Check:** all four say `OK`. If `vercel` says
`The term 'vercel' is not recognized`, the global install did not happen or the
shell has not picked it up — close the terminal and open a new one, then check
again.

> **Prefer not to install globally?** Put `npx ` in front of every `vercel` and
> `supabase` command in this guide. `npx vercel login`, `npx supabase db push`,
> and so on. It works identically and downloads on first use.

Two keys you will collect along the way. Keep them out of the repository and out
of chat:

| Key | Where it comes from | Who may see it |
|---|---|---|
| `anon` key | Supabase → Project Settings → API | The browser. Public by design |
| `service_role` key | Supabase → Project Settings → API | Server only. **Never** the browser |

---

## 1. Create the Supabase project

1. Supabase dashboard → **New project**.
2. Name it something unambiguous — `impact-cms-production`.
3. **Region: Frankfurt (eu-central-1)** or another EU region. This database holds
   the names and ages of minors; keeping it in the EEA removes a transfer
   question you would otherwise have to answer in the privacy policy.
4. Generate a strong database password and put it in your password manager. You
   need it in step 2 and nowhere else.
5. Wait for provisioning (~2 minutes).

Then collect, from **Project Settings → API**:

- Project URL → `PUBLIC_SUPABASE_URL`
- `anon` `public` key → `PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Check:** you have three values and know which of the two keys is secret.

---

## 2. Apply the database schema

From `cms/`:

```bash
supabase login
supabase link --project-ref <your-project-ref>   # the ref is in the project URL
supabase db push
```

`db push` applies every migration in `supabase/migrations/` in order — 19 of
them, from the initial tables through the RLS policies to the section types.

**Check:**

```bash
supabase migration list
```

Every migration shows a matching `local` and `remote` version. If `remote` is
blank for some, they did not apply; do not continue until they do.

> **If `db push` says migrations are already applied and refuses:** the history
> table is out of step with the schema. `supabase migration repair --status
> applied <version>` records one as done. Only do this after checking the schema
> really has that change — this repo hit exactly that situation locally.

---

## 3. Lock down auth

There is no self-registration. Accounts are created deliberately with the
service-role key, and the app has no signup route.

Supabase dashboard → **Authentication → Providers → Email**:

- **Enable email provider: ON** — this is how people sign in
- **Confirm email: OFF** — accounts are made by you, there is nobody to confirm

Supabase dashboard → **Authentication → Sign In / Providers → Auth settings**:

- **Allow new users to sign up: OFF**

> **Do not turn off the email *provider* to stop signups.** They are different
> switches. Disabling the provider disables *logins* too, and the error you get
> is `email_provider_disabled`, which does not obviously say so. This project
> lost time to it once already.

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** your Vercel production URL, once you have it (step 8). Leave it
  for now and come back.

**Check:** the Email provider is on, and new signups are off.

---

## 4. Create the storage bucket

Uploads cannot live on the Vercel filesystem — it is read-only and ephemeral, so
an uploaded image would be gone on the next invocation and every photo would 404
within minutes of a deploy.

The easiest way is to let the push script make it:

```bash
# in cms/, with .env pointing at the NEW project (see step 5)
npm run storage:push -- --dry-run
```

It creates the bucket if it is missing, public, with a 64 MB limit — and
`--dry-run` tells you what it would do without writing.

Or make it by hand: Supabase dashboard → **Storage → New bucket**:

- **Name:** `uploads`
- **Public bucket: ON**
- **File size limit:** `64 MB`

**Why public:** these are the images on the public website. A private bucket
means a signed URL per image, which is a round trip through our own server for
every photo — the exact cost that moving off the filesystem is meant to remove.
Writing still requires the service-role key, which never reaches the browser.

**Check:** the bucket is listed as `Public`.

---

## 5. Point your local `.env` at the new project

You need this to seed the database and move the images. In `cms/.env`:

```bash
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
PUBLIC_SUPABASE_STORAGE_BUCKET=uploads
```

> Keep a copy of your local-development `.env` first. `npm run env:local`
> rewrites it from the running local Supabase stack, and this project has
> already lost a working `.env` to a careless copy.

**Check:**

```bash
node -e "console.log(require('fs').readFileSync('.env','utf8').split('\n').filter(l=>l.startsWith('PUBLIC_SUPABASE_URL')).join())"
```

shows the new project's URL, not `127.0.0.1`.

---

## 6. Seed the content

Order matters: content types first, then pages, then images.

```bash
# 1. the ten content types, from the handoff's JSON and Markdown
npm run seed
#    if this repo is not inside the handoff folder:
#    IMPACT_CONTENT_DIR=/path/to/handoff/reference/content npm run seed

# 2. the eleven pages and their sections, lifted from the static HTML
npm run seed:pages
#    if the static site is elsewhere:
#    IMPACT_SITE_DIR=/path/to/handoff/site npm run seed:pages

# 3. copy the photography into storage and rewrite the paths
npm run images:migrate -- --source /path/to/handoff/site/assets

# 4. generate the AVIF/WebP ladders
npm run images:variants
```

**Check:** `npm run images:migrate` ends with `0 niet gevonden`. Anything it
could not find is listed by name — usually the `--source` path is wrong.

> **Step 3's `--source` is not optional in practice.** Its default looks one
> directory above the repo, which is rarely where the assets are. Without it
> everything reports as missing and the paths stay legacy.

---

## 7. Create the first backoffice account

```bash
npm run user:create -- someone@wemakeimpact.be 'a real password'
```

Use a real password manager entry. There is no password reset flow in the
backoffice; a lost password means creating another account with this command.

**Check:** Supabase dashboard → Authentication → Users shows the account.

---

## 8. Create the Vercel project

From `cms/`:

```bash
vercel login
vercel link
```

Answer:

- **Set up and deploy?** — no, for now. Link only.
- **Which scope?** — your team or personal account
- **Link to existing project?** — no, create a new one
- **Project name** — `impact-cms`
- **In which directory is your code located?** — `./`

> **The root directory matters.** This repository *is* the `cms` folder, so `./`
> is right. If you ever import the handoff repository as a whole instead, the
> root directory must be set to `cms` in Vercel's project settings or the build
> will not find `package.json`.

Vercel detects SvelteKit from `vercel.json`, which also adds
`X-Robots-Tag: noindex` on `/admin` and `/login` so the backoffice cannot be
indexed if a link leaks.

**Check:** `.vercel/project.json` exists locally (it is gitignored).

---

## 9. Set the environment variables

Every one of these has to exist in **Production**, and again in **Preview** if
you want preview deploys to work.

```bash
vercel env add PUBLIC_SUPABASE_URL production
vercel env add PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add PUBLIC_SUPABASE_STORAGE_BUCKET production
vercel env add PUBLIC_SITE_URL production
vercel env add PUBLIC_STATIC_SITE_BASE production
vercel env add PUBLIC_SUBSCRIBE_ENDPOINT production
vercel env add PUBLIC_TICKET_TAILOR_BOX_OFFICE production
vercel env add BREVO_API_KEY production
vercel env add TICKET_TAILOR_API_KEY production
```

What each one is, and what happens if you skip it:

| Variable | Value | If missing |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | **Nothing works.** No database, no login |
| `PUBLIC_SUPABASE_ANON_KEY` | the `anon` key | **Nothing works.** Login fails |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key | Uploads fail. Keep it out of the browser |
| `PUBLIC_SUPABASE_STORAGE_BUCKET` | `uploads` | **Every image 404s** after a deploy — uploads fall back to a filesystem that does not persist |
| `PUBLIC_SITE_URL` | `https://impact-cms.vercel.app` | The sitemap uses the request origin instead. Harmless but wrong in canonical tags |
| `PUBLIC_STATIC_SITE_BASE` | `https://demo-impact-c399e3.netlify.app` | Links to pages this app does not serve become relative and 404. All eleven pages are configured, so this is now only a fallback — set it anyway |
| `PUBLIC_SUBSCRIBE_ENDPOINT` | the Netlify function URL | The waitlist form says it is not connected, rather than posting into nowhere |
| `PUBLIC_TICKET_TAILOR_BOX_OFFICE` | the box office URL | Editions with status `open` have no ticket link |
| `BREVO_API_KEY` | from Brevo → SMTP & API | The dashboard's signups panel reports the source unavailable |
| `TICKET_TAILOR_API_KEY` | from Ticket Tailor → Settings → API | The dashboard's ticket panel reports the source unavailable |

> **`PUBLIC_` is not decoration.** Anything with that prefix is compiled into the
> browser bundle. Never give a secret a `PUBLIC_` name, and never put
> `SUPABASE_SERVICE_ROLE_KEY` in Vercel's public variables.

**Check:**

```bash
vercel env ls
```

Ten variables listed against Production.

---

## 10. Deploy

```bash
vercel deploy --prod
```

Then finish step 3: Supabase → **Authentication → URL Configuration → Site URL**
= your production URL. Logins redirect through it.

**Check the build log** for `Build Completed`. If it fails, jump to
Troubleshooting.

---

## 11. Verify the deploy

Work through all of these. Several failures only show up on one of them.

**The public site**

- [ ] The homepage loads and shows photographs, not blank boxes.
- [ ] View source. Image URLs point at
      `…supabase.co/storage/v1/object/public/uploads/…`, **not** at `/uploads/…`.
      If they point at `/uploads/`, `PUBLIC_SUPABASE_STORAGE_BUCKET` is not set
      in this environment.
- [ ] A page reveals as you scroll, and the preloader runs once per session.
- [ ] `/en` shows the English homepage.
- [ ] Every nav item leads somewhere that is not a 404.

**The backoffice**

- [ ] `/admin` while signed out redirects to `/login`.
- [ ] Signing in with the account from step 7 works.
- [ ] `/admin` shows counts, not zeroes.
- [ ] **Upload an image** on any record, save, and reload the public page. It
      appears. Then check Supabase → Storage: the file and its variant ladder
      are in the bucket. *Check the bucket, not just the page — the page would
      look right even if the file had gone to a disk that will not survive.*
- [ ] `/admin/signalen` shows Brevo and Ticket Tailor data, or says plainly which
      source is unavailable and why.

**Not indexed — the whole deploy, on purpose**

```bash
curl -sI https://<your-domain>/admin | grep -i x-robots-tag
curl -s  https://<your-domain>/ | grep -i 'name="robots"'
```

- [ ] The header returns `noindex, nofollow` on `/admin`.
- [ ] The homepage's HTML carries `<meta name="robots" content="noindex,
      nofollow">` too.

**That second one is deliberate, and is not a bug to fix.** This app renders the
same marketing pages that are live on Netlify. If Google indexed both, they
would compete as duplicates and the Vercel copy could outrank the real site.
`src/app.html` therefore marks *everything* noindex, and `vercel.json` adds the
header on the backoffice routes as a second layer.

If this deploy ever becomes the canonical public site — phase two, when it
replaces the Netlify build rather than shadowing it — the meta tag in
`src/app.html` has to come out, and the `pages` table's per-page `robots` field
becomes the control instead.

---

## 12. A custom domain, when you want one

Vercel → Project → **Settings → Domains** → add e.g.
`backoffice.wemakeimpact.be`, then create the CNAME it shows you at your DNS
provider.

Afterwards, and this is easy to forget:

1. Update `PUBLIC_SITE_URL` to the new domain.
2. Update Supabase → Authentication → **Site URL** to the new domain.
3. **Redeploy.** See the warning below.

---

## Troubleshooting

**Every route returns `{"message":"Internal Error"}` — including `/login`.**
The Supabase variables are not set in that environment. `hooks.server.ts` builds
a Supabase client on every request, and it throws on empty values, so one
missing variable takes out the whole site rather than one page.

Open the URL directly rather than guessing: the app now answers with the names
of the missing variables in plain text. If you still see Vercel's generic JSON,
the deploy predates that check — set the variables and redeploy, and it will
either work or tell you what is still missing.

```bash
vercel env ls                       # what is actually set, per environment
vercel logs <deployment-url>        # the thrown error itself
```

The usual cause is that the variables were added *after* the last deploy. See
the next entry.

**A variable I changed in Vercel has no effect.**
Environment variables reach the running app only at deploy time. Changing one in
the dashboard and refreshing the page changes nothing — redeploy. `07-DECISIONS`
records this project losing time to it twice, with Brevo returning `401` against
a key that was already correct in the dashboard.

**Build fails with `EPERM: operation not permitted, symlink`.**
Only happens on Windows, locally. The Vercel adapter symlinks its route
functions and Windows refuses without Developer Mode. It is not a code problem —
the same build succeeds on Vercel's Linux builders. To check a production build
on Windows:

```bash
ADAPTER=node npm run build
```

**Login says `email_provider_disabled`.**
The email *provider* is off. That is a different switch from *allow new users to
sign up*. Turn the provider back on; leave signups off. See step 3.

**Images are broken after a deploy, and their URLs start with `/uploads/`.**
`PUBLIC_SUPABASE_STORAGE_BUCKET` is missing in that environment, so the app fell
back to the filesystem. Add it and redeploy.

**Images are broken, and their URLs point at Supabase.**
The objects are not in the bucket. Run `npm run storage:push` with `.env` pointed
at the production project. Or the bucket is private — check Storage → the bucket
shows `Public`.

**`permission denied for table …` from the backoffice.**
RLS and GRANT are different things. `db push` applies both; if you built the
schema by hand, the grants are missing. Re-run `supabase db push`.

**Uploading a video fails at ~50 MB.**
Supabase's per-bucket limit. Set it to 64 MB to match the app's own ceiling
(`MAX_VIDEO_BYTES`), in Storage → bucket → Settings.

**The dashboard says a source is unavailable.**
That is the panel working. It reports the reason rather than showing an empty
chart. Check the key, then that you redeployed after setting it.

---

## Moving storage somewhere else later

`src/lib/server/storage.ts` is the only file that knows where files are. The
paths in the database stay `/uploads/<table>/<id>/<file>` whichever backend is
in use, and `imageUrl()` maps them at render time — so a backend change is a
config change, not a content migration.

To go back to a filesystem, on a host that has a persistent volume:

```bash
UPLOAD_BACKEND=disk
UPLOAD_DIR=/mnt/data/uploads
```

and copy the bucket's contents into that folder.
