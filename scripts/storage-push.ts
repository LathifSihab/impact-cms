/**
 * Copy the local uploads folder into Supabase Storage.
 *
 * Run this once when moving off the disk backend, and again after any period
 * of local work that produced files. It is idempotent: an object that is
 * already there with the same size is skipped, and the keys are the same paths
 * the database already stores, so nothing in the content changes.
 *
 * The database is never touched. That is the point of keeping `/uploads/...`
 * in the columns rather than a bucket URL: the backend can move without a
 * content migration behind it.
 *
 * Run:  npm run storage:push
 *       npm run storage:push -- --dry-run
 *       npm run storage:push -- --prune     (delete objects with no local file)
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const bucket = process.env.PUBLIC_SUPABASE_STORAGE_BUCKET;

if (!url || !serviceKey) {
  console.error(envHelp(root));
  process.exit(1);
}
if (!bucket) {
  console.error(
    '\nPUBLIC_SUPABASE_STORAGE_BUCKET is niet gezet.\n\n' +
      'Zet die op de naam van de bucket (bijvoorbeeld "uploads") in .env, en\n' +
      'in de omgeving van de deploy. Zonder die naam blijft de opslag op schijf\n' +
      'staan, en op Vercel betekent dat dat elke afbeelding na een deploy weg is.\n'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const prune = argv.includes('--prune');
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
  '.gif': 'image/gif',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4'
};

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/* Make sure the bucket exists and is public. A private bucket would mean a
   signed URL per image, which is a round trip through our own server for every
   photo — the cost this move exists to remove. */
{
  const { data: buckets } = await db.storage.listBuckets();
  const found = (buckets ?? []).find((b) => b.name === bucket);
  if (!found) {
    if (dryRun) {
      console.log(`Zou bucket "${bucket}" aanmaken (publiek).`);
    } else {
      const { error } = await db.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 64 * 1024 * 1024
      });
      if (error) {
        console.error(`Bucket "${bucket}" aanmaken is niet gelukt: ${error.message}`);
        process.exit(1);
      }
      console.log(`Bucket "${bucket}" aangemaakt (publiek).`);
    }
  } else if (!found.public) {
    console.warn(
      `\nLet op: bucket "${bucket}" staat op privé. De site kan de afbeeldingen dan\n` +
        'niet rechtstreeks laden. Zet hem op publiek in het Supabase-dashboard.\n'
    );
  }
}

const files = walk(UPLOAD_DIR);
console.log(`\nBron:   ${UPLOAD_DIR}  (${files.length} bestanden)`);
console.log(`Bucket: ${bucket}`);
if (dryRun) console.log('Modus:  dry run, er wordt niets geschreven');
console.log('');

let sent = 0;
let skipped = 0;
const failed: string[] = [];

/** What is already in the bucket, by key, with its size. */
const remote = new Map<string, number>();
async function indexRemote(prefix: string) {
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) return;
  for (const entry of data ?? []) {
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    // A folder comes back with no id; recurse into it.
    if (entry.id === null) await indexRemote(key);
    else remote.set(key, (entry.metadata as { size?: number } | null)?.size ?? -1);
  }
}
await indexRemote('');
console.log(`Al in de bucket: ${remote.size} objecten\n`);

for (const full of files) {
  const key = relative(UPLOAD_DIR, full).split('\\').join('/');
  const bytes = readFileSync(full);
  const already = remote.get(key);

  if (already === bytes.byteLength) {
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  zou uploaden  ${key}  (${(bytes.byteLength / 1024).toFixed(0)} KB)`);
    sent++;
    continue;
  }

  const { error } = await db.storage.from(bucket).upload(key, bytes, {
    contentType: TYPES[extname(full).toLowerCase()] ?? 'application/octet-stream',
    upsert: true
  });
  if (error) {
    failed.push(`${key}: ${error.message}`);
  } else {
    sent++;
    if (sent % 50 === 0) console.log(`  ${sent} geüpload…`);
  }
}

if (prune) {
  const local = new Set(files.map((f) => relative(UPLOAD_DIR, f).split('\\').join('/')));
  const orphans = [...remote.keys()].filter((k) => !local.has(k));
  if (orphans.length && !dryRun) {
    await db.storage.from(bucket).remove(orphans);
  }
  console.log(`\n${orphans.length} objecten zonder lokaal bestand ${dryRun ? 'zouden weg' : 'verwijderd'}.`);
}

console.log(`\n${sent} geüpload, ${skipped} al aanwezig, ${failed.length} mislukt.`);
if (failed.length) {
  console.log('\nMislukt:');
  for (const f of failed) console.log(`  ${f}`);
  process.exit(1);
}
