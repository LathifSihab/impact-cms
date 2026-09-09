/**
 * Where uploaded files actually live.
 *
 * Two backends behind one interface. The disk backend is what this project
 * started with and is still the right thing for local work: no network, no
 * bucket to provision. The Supabase backend is what production needs, because
 * 06-CMS-SCOPE puts the CMS on Vercel and Vercel's filesystem is read-only and
 * ephemeral — a file written at runtime is gone on the next invocation, and
 * every image would 404 within minutes of a deploy.
 *
 * The key is the same in both: `<collection>/<record-id>/<file>`. Nothing
 * outside this module knows which backend is in use, and the paths stored in
 * the database are backend-neutral, so switching does not rewrite content.
 *
 * The default is Supabase whenever a bucket is configured, including locally.
 * That is deliberate: a dev environment that exercises a different storage path
 * from production is a dev environment that cannot catch storage bugs.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* process.env rather than $env/dynamic/*: this module is server-only, and the
   maintenance scripts import it directly under plain node, where SvelteKit's
   aliases do not resolve. Both runtimes populate process.env. */
const env = process.env;
const publicEnv = process.env;

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export type BackendName = 'supabase' | 'disk';

/* Read lazily, never at module load.
 *
 * hooks.server.ts copies the dev server's .env into process.env, and that runs
 * after this module is first imported. Reading these at load time would freeze
 * the answer before the bridge had a chance to fill it in — which showed up as
 * uploads landing on disk while the pages read from the bucket. */
export function bucketName(): string {
  return env.PUBLIC_SUPABASE_STORAGE_BUCKET ?? '';
}

/** Supabase when a bucket is named, disk otherwise. UPLOAD_BACKEND overrides. */
export function backend(): BackendName {
  if (env.UPLOAD_BACKEND === 'disk' || env.UPLOAD_BACKEND === 'supabase') return env.UPLOAD_BACKEND;
  return bucketName() ? 'supabase' : 'disk';
}

/** Where the disk backend keeps files. Configurable for a mounted volume. */
export function uploadDir(): string {
  return env.UPLOAD_DIR ? resolve(env.UPLOAD_DIR) : join(appRoot, 'uploads');
}

export interface Storage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Immediate children of a prefix, as bare names. */
  list(prefix: string): Promise<string[]>;
  /** Remove everything under a prefix. */
  removePrefix(prefix: string): Promise<void>;
}

/* ---------------------------------------------------------------- disk ---- */

/**
 * Resolve a key to a path inside UPLOAD_DIR, refusing anything outside it.
 *
 * The check is on the resolved absolute path rather than on the input text,
 * because encoded traversal and symlinked segments both survive inspection of
 * the string.
 */
function onDisk(key: string): string | null {
  const root = uploadDir();
  const cleaned = normalize(key).replace(/^([/\\])+/, '');
  const full = resolve(root, cleaned);
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

const diskStorage: Storage = {
  async put(key, bytes) {
    const full = onDisk(key);
    if (!full) throw new Error('Ongeldig pad.');
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes);
  },
  async get(key) {
    const full = onDisk(key);
    if (!full || !existsSync(full)) return null;
    return new Uint8Array(await readFile(full));
  },
  async del(key) {
    const full = onDisk(key);
    if (full) await rm(full, { force: true });
  },
  async exists(key) {
    const full = onDisk(key);
    if (!full) return false;
    try {
      await stat(full);
      return true;
    } catch {
      return false;
    }
  },
  async list(prefix) {
    const full = onDisk(prefix);
    if (!full) return [];
    try {
      return await readdir(full);
    } catch {
      return [];
    }
  },
  async removePrefix(prefix) {
    const full = onDisk(prefix);
    if (full && full.startsWith(uploadDir() + sep)) await rm(full, { recursive: true, force: true });
  }
};

/* ------------------------------------------------------------ supabase ---- */

let client: SupabaseClient | null = null;

/** The service-role client. Uploads are never done with the anon key. */
function supabase(): SupabaseClient {
  if (!client) {
    const url = publicEnv.PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn nodig voor opslag in Supabase.'
      );
    }
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

const supabaseStorage: Storage = {
  async put(key, bytes, contentType) {
    const { error } = await supabase()
      .storage.from(bucketName())
      // upsert, because a re-upload of the same bytes lands on the same key —
      // the name carries a content hash — and that must not be an error.
      .upload(key, bytes, { contentType, upsert: true });
    if (error) throw new Error(`Opslaan is niet gelukt: ${error.message}`);
  },
  async get(key) {
    const { data, error } = await supabase().storage.from(bucketName()).download(key);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  },
  async del(key) {
    await supabase().storage.from(bucketName()).remove([key]);
  },
  async exists(key) {
    const slash = key.lastIndexOf('/');
    const folder = slash === -1 ? '' : key.slice(0, slash);
    const name = slash === -1 ? key : key.slice(slash + 1);
    const { data } = await supabase().storage.from(bucketName()).list(folder, { search: name, limit: 100 });
    return (data ?? []).some((f) => f.name === name);
  },
  async list(prefix) {
    const { data } = await supabase().storage.from(bucketName()).list(prefix, { limit: 1000 });
    return (data ?? []).map((f) => f.name);
  },
  async removePrefix(prefix) {
    const names = await supabaseStorage.list(prefix);
    if (!names.length) return;
    await supabase()
      .storage.from(bucketName())
      .remove(names.map((n) => `${prefix}/${n}`));
  }
};

/* A thin façade, so the backend is chosen per call rather than at import. */
export const storage: Storage = {
  put: (k, b, t) => (backend() === 'supabase' ? supabaseStorage : diskStorage).put(k, b, t),
  get: (k) => (backend() === 'supabase' ? supabaseStorage : diskStorage).get(k),
  del: (k) => (backend() === 'supabase' ? supabaseStorage : diskStorage).del(k),
  exists: (k) => (backend() === 'supabase' ? supabaseStorage : diskStorage).exists(k),
  list: (p) => (backend() === 'supabase' ? supabaseStorage : diskStorage).list(p),
  removePrefix: (p) => (backend() === 'supabase' ? supabaseStorage : diskStorage).removePrefix(p)
};

/**
 * The URL a browser should fetch a key from.
 *
 * With Supabase this is the bucket's public URL, so images come off the CDN
 * rather than through a function on every request. With disk it is the route
 * that serves the folder. Both are computed from the same stored path, which is
 * why that path stays backend-neutral in the database.
 */
export function publicUrlFor(key: string): string {
  if (backend() !== 'supabase') return `/uploads/${key}`;
  const base = (publicEnv.PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${bucketName()}/${key}`;
}
