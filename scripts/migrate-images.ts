/**
 * Move the legacy `assets/...` image paths into managed uploads.
 *
 * The seeded content points at the static site's files — `assets/img/court-169.jpg`
 * and friends. Those paths mean nothing to this app, which serves uploads from
 * its own folder, so every seeded record currently shows a placeholder.
 *
 * This copies each referenced file into uploads/<table>/<record>/ and rewrites
 * the column to the new path. It is idempotent: a value already under /uploads/
 * is skipped, so running it twice is harmless.
 *
 * The photography is NOT in the handoff — assets/img and assets/video were left
 * out at 17 MB and 19 MB. Files it cannot find are reported and left alone
 * rather than blanked, so the record keeps a value you can still trace. Point
 * --source at the original repo's assets folder to complete the migration.
 *
 * Run:  npm run images:migrate
 *       npm run images:migrate -- --source ../../impact-original/site/assets
 *       npm run images:migrate -- --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS, NAV_ORDER, type Field } from '../src/lib/collections.ts';
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

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const sourceArg = argv.indexOf('--source');
/** Where the legacy files live. Default: the handoff's own assets folder. */
const SOURCE = resolve(
  sourceArg >= 0 && argv[sourceArg + 1] ? argv[sourceArg + 1] : join(root, '..', 'assets')
);
const UPLOAD_DIR = process.env.UPLOAD_DIR ? resolve(process.env.UPLOAD_DIR) : join(root, 'uploads');

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

let copied = 0;
let skipped = 0;
const missing: string[] = [];

/** `assets/img/camp/court.jpg` -> the file on disk under --source. */
function locate(stored: string): string | null {
  const rel = stored.replace(/^\/+/, '').replace(/^assets\//, '');
  const candidate = join(SOURCE, rel);
  return existsSync(candidate) ? candidate : null;
}

async function migrateValue(
  table: string,
  recordId: string,
  field: string,
  stored: string
): Promise<string | null> {
  if (!stored || stored.startsWith('/uploads/')) {
    skipped++;
    return null;
  }

  const onDisk = locate(stored);
  if (!onDisk) {
    missing.push(`${table}/${recordId}.${field}  ${stored}`);
    return null;
  }

  const ext = extname(onDisk).toLowerCase();
  if (!EXT_OK.has(ext)) {
    missing.push(`${table}/${recordId}.${field}  ${stored} (geen afbeelding)`);
    return null;
  }

  const bytes = readFileSync(onDisk);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const name = `${field.replace(/[^a-z0-9-]/gi, '-')}-${digest}${ext === '.jpeg' ? '.jpg' : ext}`;
  const dir = join(UPLOAD_DIR, table, recordId);
  const publicPath = `/uploads/${table}/${recordId}/${name}`;

  if (!dryRun) {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), bytes);
  }
  copied++;
  console.log(`  ${dryRun ? 'zou kopiëren' : 'gekopieerd'}  ${basename(onDisk)} -> ${publicPath}`);
  return publicPath;
}

console.log(`\nBron:   ${SOURCE}${existsSync(SOURCE) ? '' : '  (bestaat niet)'}`);
console.log(`Doel:   ${UPLOAD_DIR}`);
if (dryRun) console.log('Modus:  dry run, er wordt niets geschreven');
console.log('');

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

  for (const record of data ?? []) {
    const row = record as Record<string, unknown>;
    const id = String(row.id);
    const patch: Record<string, unknown> = {};

    for (const f of imageFields) {
      const next = await migrateValue(c.table, id, f.name, String(row[f.name] ?? ''));
      if (next) patch[f.name] = next;
    }

    for (const f of rowFields) {
      if (f.kind !== 'rows') continue;
      const rows = Array.isArray(row[f.name]) ? [...(row[f.name] as Record<string, string>[])] : [];
      let touched = false;
      for (let i = 0; i < rows.length; i++) {
        for (const col of f.columns) {
          if (col.kind !== 'image') continue;
          const next = await migrateValue(
            c.table,
            id,
            `${f.name}-${i}`,
            String(rows[i]?.[col.name] ?? '')
          );
          if (next) {
            rows[i] = { ...rows[i], [col.name]: next };
            touched = true;
          }
        }
      }
      if (touched) patch[f.name] = rows;
    }

    if (Object.keys(patch).length && !dryRun) {
      const { error: upErr } = await db.from(c.table).update(patch).eq('id', id);
      if (upErr) console.error(`  ${c.table}/${id}: ${upErr.message}`);
    }
  }
}

console.log(`\n${copied} gekopieerd, ${skipped} al in orde, ${missing.length} niet gevonden.`);

if (missing.length) {
  console.log('\nNiet gevonden — deze bestanden zitten niet in de handoff:');
  for (const m of missing) console.log(`  ${m}`);
  console.log(
    '\nDe fotografie (assets/img) en video (assets/video) zijn bewust weggelaten,\n' +
      '17 MB en 19 MB. Wijs naar de originele repo om dit af te maken:\n' +
      '  npm run images:migrate -- --source /pad/naar/original/site/assets\n' +
      '\nDe paden blijven ongewijzigd staan, zodat je ze nog kunt terugvinden.'
  );
}
