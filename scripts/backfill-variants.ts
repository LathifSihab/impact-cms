/**
 * Give images that were uploaded before the responsive ladder existed one now.
 *
 * New uploads get their AVIF/WebP ladder written the moment they are saved, and
 * their intrinsic width goes into the filename so the renderer can build a
 * srcset without touching the disk. Everything uploaded or migrated before that
 * has a filename with no width in it, which the renderer reads as "no variants"
 * and falls back to a plain <img> — correct, but it means a phone downloads the
 * full-size photo.
 *
 * This walks every image reference in the database, renames the original to
 * carry its width, generates the ladder, and rewrites the reference. It is
 * idempotent: a file already carrying a width is only checked for missing
 * rungs, so a second run costs a stat per variant and nothing else.
 *
 * Run:  npm run images:variants
 *       npm run images:variants -- --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS, NAV_ORDER, type Field } from '../src/lib/collections.ts';
import { intrinsicWidth, isConvertible, ladderFor } from '../src/lib/images.ts';
import { generate, normalise } from '../src/lib/server/variants.ts';
import { storage, backend } from '../src/lib/server/storage.ts';
import { envHelp } from './env-help.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(join(root, '.env'));

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(envHelp(root));
  process.exit(1);
}

const dryRun = process.argv.slice(2).includes('--dry-run');
const UPLOAD_DIR = process.env.UPLOAD_DIR ? resolve(process.env.UPLOAD_DIR) : join(root, 'uploads');

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif'
};
const contentTypeOf = (ext: string) => TYPES[ext] ?? 'application/octet-stream';

let renamed = 0;
let laddered = 0;
let alreadyDone = 0;
let variantsWritten = 0;
const problems: string[] = [];

/** Public path (/uploads/a/b/c.jpg) to the storage key. */
function keyOf(publicPath: string): string {
  const relative = publicPath.slice('/uploads/'.length);
  return relative.includes('..') ? '' : relative;
}

/* One file can be referenced from more than one row — a gallery entry and a
   hero pointing at the same photo, or the same section repeated across locales.
   The first reference renames the file, so without this the second would find
   it gone and leave a dead path behind. */
const done = new Map<string, string | null>();

/**
 * Bring one stored image up to date.
 *
 * Returns the value the database should now hold, or null when nothing changed.
 */
async function upgrade(stored: string): Promise<string | null> {
  if (!stored.startsWith('/uploads/')) return null;
  if (!isConvertible(stored)) return null;
  if (done.has(stored)) return done.get(stored) ?? null;

  const result = await upgradeOnce(stored);
  done.set(stored, result);
  return result;
}

async function upgradeOnce(stored: string): Promise<string | null> {
  const key = keyOf(stored);
  if (!key || !(await storage.exists(key))) {
    problems.push(`${stored}  (bestand ontbreekt)`);
    return null;
  }

  const existing = intrinsicWidth(stored);
  if (existing) {
    // Already named for its width; only fill in rungs that are missing.
    const full = ladderFor(existing).length * 2;
    const written = dryRun ? 0 : await generate(key, existing);
    variantsWritten += written;
    if (written === 0) {
      alreadyDone++;
    } else {
      laddered++;
      console.log(`  ladder aangevuld  ${basename(stored)}  (+${written} van ${full})`);
    }
    return null;
  }

  const ext = extname(key).toLowerCase();
  const source = await storage.get(key);
  if (!source) {
    problems.push(`${stored}  (bestand ontbreekt)`);
    return null;
  }
  const normalised = await normalise(source, ext);
  if (!normalised) {
    problems.push(`${stored}  (kon de breedte niet lezen)`);
    return null;
  }

  const { width } = normalised;
  const stem = basename(key, ext);
  const nextName = `${stem}-${width}${ext}`;
  const nextKey = `${key.slice(0, key.lastIndexOf('/'))}/${nextName}`;
  const nextPublic = `${stored.slice(0, stored.lastIndexOf('/'))}/${nextName}`;

  console.log(
    `  ${dryRun ? 'zou hernoemen' : 'hernoemd'}  ${basename(stored)} -> ${nextName} (${width}px)`
  );

  if (dryRun) {
    renamed++;
    return nextPublic;
  }

  /* Write the new name first, generate from it, and only then drop the old
     file — so an interrupted run leaves a working image rather than a gap. */
  await storage.put(nextKey, normalised.bytes, contentTypeOf(ext));
  variantsWritten += await generate(nextKey, width);
  if (nextKey !== key) await storage.del(key);

  renamed++;
  return nextPublic;
}

/** Rewrite every /uploads/ string inside a jsonb value, however deeply nested. */
async function upgradeDeep(value: unknown): Promise<{ value: unknown; touched: boolean }> {
  if (typeof value === 'string') {
    const next = await upgrade(value);
    return next ? { value: next, touched: true } : { value, touched: false };
  }
  if (Array.isArray(value)) {
    let touched = false;
    const out: unknown[] = [];
    for (const item of value) {
      const r = await upgradeDeep(item);
      touched ||= r.touched;
      out.push(r.value);
    }
    return { value: out, touched };
  }
  if (value && typeof value === 'object') {
    let touched = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const r = await upgradeDeep(v);
      touched ||= r.touched;
      out[k] = r.value;
    }
    return { value: out, touched };
  }
  return { value, touched: false };
}

console.log(`
Opslag:  ${backend()}${backend() === 'disk' ? ` (${UPLOAD_DIR})` : ''}`);
if (dryRun) console.log('Modus:   dry run, er wordt niets geschreven');
console.log('');

/* --- the content types ---------------------------------------------------- */
for (const key of NAV_ORDER) {
  const c = COLLECTIONS[key];
  const imageFields = c.fields.filter((f: Field) => f.kind === 'image');
  const rowFields = c.fields.filter(
    (f: Field) => f.kind === 'rows' && f.columns.some((col) => col.kind === 'image')
  );
  if (imageFields.length === 0 && rowFields.length === 0) continue;

  const { data, error } = await db.from(c.table).select('*');
  if (error) {
    console.error(`  ${c.table}: ${error.message}`);
    continue;
  }

  for (const record of (data ?? []) as Record<string, unknown>[]) {
    const patch: Record<string, unknown> = {};

    for (const f of imageFields) {
      const next = await upgrade(String(record[f.name] ?? ''));
      if (next) patch[f.name] = next;
    }
    for (const f of rowFields) {
      const r = await upgradeDeep(record[f.name]);
      if (r.touched) patch[f.name] = r.value;
    }

    if (Object.keys(patch).length && !dryRun) {
      const { error: upErr } = await db.from(c.table).update(patch).eq('id', record.id);
      if (upErr) console.error(`  ${c.table}/${record.id}: ${upErr.message}`);
    }
  }
}

/* --- pages and their sections --------------------------------------------- */
{
  const { data: pages, error } = await db.from('pages').select('id, locale, hero_image');
  if (error) console.error(`  pages: ${error.message}`);
  for (const row of (pages ?? []) as Record<string, any>[]) {
    const next = await upgrade(String(row.hero_image ?? ''));
    if (next && !dryRun) {
      const { error: upErr } = await db
        .from('pages')
        .update({ hero_image: next })
        .eq('id', row.id)
        .eq('locale', row.locale);
      if (upErr) console.error(`  pages/${row.id}-${row.locale}: ${upErr.message}`);
    }
  }

  /* Sections keep their images in jsonb, and not always under `image` — the
     reel carries a poster on every clip — so the whole object is walked. */
  const { data: sections, error: secErr } = await db.from('page_sections').select('id, content');
  if (secErr) console.error(`  page_sections: ${secErr.message}`);
  for (const row of (sections ?? []) as Record<string, any>[]) {
    const r = await upgradeDeep(row.content ?? {});
    if (r.touched && !dryRun) {
      const { error: upErr } = await db
        .from('page_sections')
        .update({ content: r.value })
        .eq('id', row.id);
      if (upErr) console.error(`  page_sections/${row.id}: ${upErr.message}`);
    }
  }
}

console.log(
  `\n${renamed} hernoemd, ${laddered} ladder aangevuld, ${alreadyDone} al compleet, ` +
    `${variantsWritten} varianten geschreven.`
);
if (problems.length) {
  console.log('\nOvergeslagen:');
  for (const p of problems) console.log(`  ${p}`);
}
