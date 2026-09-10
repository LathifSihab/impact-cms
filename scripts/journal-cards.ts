/**
 * Lift the journal cards that exist only as markup.
 *
 * site/journal.html shows ten posts; the handoff (reference/content/journal)
 * ships four as Markdown. The other six were never written — their cards say
 * "door IMPACT aan te leveren" — so they exist as a card and nothing else. The
 * CMS site therefore showed four where the old site showed ten.
 *
 * This inserts the missing six with everything the card actually states, and an
 * empty body for IMPACT to write in the backoffice. The article page renders
 * fine without one: hero, image, date, related event, no prose.
 *
 * About the dates. Cards carry none, but published_at is required and is what
 * orders the feed. The four known dates ascend with position on the page
 * (grid 0 = 05 Aug, grid 1 = 19 Aug, grid 3 = 28 Aug), so each missing card is
 * given a date interpolated from its neighbours on that same trend. That keeps
 * the six in the order the page puts them and leaves the four handoff dates
 * untouched. It does NOT reproduce the page's exact card sequence: the page
 * runs oldest-first and features its oldest post, while the CMS is a
 * newest-first feed. Matching that would mean rewriting the handoff's own
 * dates, which is not this script's call to make.
 *
 * Existing posts are matched by title, not by slug — the handoff's ids are
 * shortened ("this-was-basketball-edition-2026" for "This was IMPACT Camp:
 * Basketball Edition 2026"), so slug comparison would insert duplicates.
 *
 *   npx tsx scripts/journal-cards.ts [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
for (const l of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = l.replace('﻿', '').match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const DRY = process.argv.includes('--dry-run');
const SITE = process.env.IMPACT_SITE_DIR
  ? resolve(process.env.IMPACT_SITE_DIR)
  : resolve(root, '..', 'site');

const file = join(SITE, 'journal.html');
if (!existsSync(file)) {
  console.error(`Geen journal.html op ${file}`);
  process.exit(1);
}

const db = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
});

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&times;/g, '×')
    .replace(/&middot;/g, '·')
    .replace(/&eacute;/g, 'é')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, c) => String.fromCharCode(Number(c)))
    .replace(/&shy;/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (t: string) =>
  t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

interface Card {
  pos: number;
  category: string;
  title: string;
  image: string;
  alt: string;
  meta: string;
  id: string;
}

function readCard(block: string, category: string, pos: number): Card {
  const img = block.match(/<img src="([^"]*)"[^>]*alt="([^"]*)"/);
  const title = block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
  const meta = block.match(/<p class="(?:meta|intro)">([\s\S]*?)<\/p>/);
  const t = clean(title?.[1] ?? '');
  return {
    pos,
    category,
    title: t,
    image: img?.[1] ?? '',
    alt: img?.[2] ?? '',
    meta: clean(meta?.[1] ?? ''),
    id: slugify(t)
  };
}

const html = readFileSync(file, 'utf8');
const cards: Card[] = [];

/* The feature sits above the grid and is a post like any other; -1 keeps it
   ahead of grid position 0 when the two are read as one sequence. */
const feature = html.match(/<article class="feature" data-cat="([^"]*)"[\s\S]*?<\/article>/);
if (feature) cards.push(readCard(feature[0], feature[1], -1));

let n = 0;
for (const m of html.matchAll(/<article class="jcard"[^>]*data-cat="([^"]*)"[\s\S]*?<\/article>/g)) {
  cards.push(readCard(m[0], m[1], n++));
}

const { data: existing, error } = await db.from('journal').select('id,title,published_at,locale');
if (error) {
  console.error(`Kon journal niet lezen — ${error.message}`);
  process.exit(1);
}

const known = new Map<string, string>(); // title -> published_at
for (const r of (existing ?? []) as { title: string; published_at: string; locale: string }[]) {
  if (r.locale === 'nl') known.set(r.title, r.published_at);
}

/* Anchors: the cards whose date is already known, in page order. Every missing
   card is dated from the two anchors surrounding it. */
const day = 86400000;
const anchors = cards
  .filter((c) => known.has(c.title))
  .map((c) => ({ pos: c.pos, at: Date.parse(known.get(c.title)!) }))
  .sort((a, b) => a.pos - b.pos);

if (anchors.length < 2) {
  console.error('Te weinig bekende datums om tussen te interpoleren.');
  process.exit(1);
}

const today = Date.now();
const latest = today - day; // nothing dated today or later
const first = anchors[0];
const last = anchors.at(-1)!;
const span = (last.at - first.at) / (last.pos - first.pos);

const missing = cards.filter((c) => !known.has(c.title));

/* Cards after the last anchor have nothing to interpolate between. Continuing
   the anchors' own spacing would run past today, and clamping each one to
   "yesterday" individually would pile them all onto the same date — which
   destroys the very ordering this is here to preserve. So the tail is spread
   evenly across whatever room is left between the last anchor and yesterday,
   which keeps every date distinct and in page order however little room that
   is. */
const tail = missing.filter((c) => c.pos > last.pos).map((c) => c.pos).sort((a, b) => a - b);
const room = latest - last.at;
const step = tail.length ? Math.min(span, room / tail.length) : span;
if (tail.length && room < tail.length * day) {
  console.warn(
    `Let op: maar ${Math.floor(room / day)} dagen tussen de laatste bekende datum en ` +
      `vandaag voor ${tail.length} artikelen — datums komen dicht op elkaar.\n`
  );
}

function dateFor(pos: number): string {
  const before = [...anchors].reverse().find((a) => a.pos < pos);
  const after = anchors.find((a) => a.pos > pos);
  let at: number;
  if (before && after) {
    at = before.at + ((after.at - before.at) * (pos - before.pos)) / (after.pos - before.pos);
  } else if (before) {
    at = before.at + step * (tail.indexOf(pos) + 1);
  } else {
    at = after!.at - span * (after!.pos - pos);
  }
  return new Date(Math.min(at, latest)).toISOString().slice(0, 10);
}

console.log(`\n${cards.length} kaarten op de pagina, ${known.size} al in de databank\n`);
if (!missing.length) {
  console.log('Niets te doen.\n');
  process.exit(0);
}

const rows = missing.map((c) => ({
  id: c.id,
  category: c.category,
  title: c.title,
  image: c.image,
  alt: c.alt,
  meta: c.meta,
  published_at: dateFor(c.pos),
  locale: 'nl',
  body: ''
}));

for (const r of rows) {
  console.log(`  ${DRY ? 'zou toevoegen' : 'toegevoegd'}  ${r.published_at}  [${r.category.padEnd(10)}] ${r.title}`);
}

if (DRY) {
  console.log('\nProefrun. Niets geschreven.\n');
  process.exit(0);
}

const { error: insErr } = await db.from('journal').insert(rows);
if (insErr) {
  console.error(`\nFOUT — ${insErr.message}\n`);
  process.exit(1);
}
console.log(`\n${rows.length} artikelen toegevoegd, met een lege tekst om in te vullen.\n`);
