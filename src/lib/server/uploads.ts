/**
 * File storage for uploaded images.
 *
 * Everything that touches the filesystem is in this one module on purpose. The
 * chosen backend is a folder on disk, which works on any host with a real
 * volume — and does *not* work on Vercel, whose runtime filesystem is read-only
 * and ephemeral. Moving to Supabase Storage later means reimplementing `save`,
 * `remove` and `publicPath` here and changing nothing else.
 *
 * Files are NOT written into static/. That directory is copied into the build
 * output when the adapter runs, so anything added afterwards is invisible to the
 * server. They go to an ordinary directory served by routes/uploads/[...path].
 *
 * Layout is one folder per record:
 *
 *   uploads/<collection>/<record-id>/<field>-<n>.<ext>
 *
 * so everything belonging to one edition sits together and removing the record
 * can take its images with it.
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '$env/dynamic/private';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Where files live. Configurable so a deploy can point at a mounted volume. */
export const UPLOAD_DIR = env.UPLOAD_DIR ? resolve(env.UPLOAD_DIR) : join(appRoot, 'uploads');

/** URL prefix the serving route listens on. */
export const UPLOAD_URL_PREFIX = '/uploads';

/**
 * What may be uploaded.
 *
 * SVG is deliberately absent. It is an image to a designer and a script host to
 * a browser, and these files are served from the same origin as the backoffice,
 * so an uploaded SVG could run script against a logged-in session. If vector
 * logos are ever needed, serve them from a separate origin or sanitise them.
 */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif'
};

export const MAX_BYTES = Number(env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);

export class UploadError extends Error {}

/** Magic numbers, because a Content-Type header is whatever the client says. */
function sniff(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  const riff = String.fromCharCode(b[0], b[1], b[2], b[3]);
  const webp = String.fromCharCode(b[8], b[9], b[10], b[11]);
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  // AVIF: 'ftyp' at offset 4, brand at 8
  const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7]);
  const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
  if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis')) return 'image/avif';
  return null;
}

/** Strip anything that could escape the intended directory. */
function safeSegment(s: string): string {
  const cleaned = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new UploadError('Ongeldige naam.');
  }
  return cleaned;
}

export interface SavedFile {
  /** Value stored in the database and rendered in `src`. */
  path: string;
  bytes: number;
  type: string;
}

/**
 * Write one uploaded file and return the path to store.
 *
 * The filename is derived from the field plus a short content hash rather than
 * the name the browser sent: user filenames collide, carry other people's
 * spelling, and are the usual way a traversal slips in. The hash also means
 * re-uploading the same image twice does not litter the folder.
 */
export async function save(
  collection: string,
  recordId: string,
  field: string,
  file: File
): Promise<SavedFile> {
  if (file.size === 0) throw new UploadError('Het bestand is leeg.');
  if (file.size > MAX_BYTES) {
    throw new UploadError(`Maximaal ${Math.floor(MAX_BYTES / (1024 * 1024))} MB.`);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = sniff(buffer);
  if (!detected || !ALLOWED[detected]) {
    throw new UploadError('Alleen JPG, PNG, WebP, AVIF of GIF.');
  }

  const dir = join(UPLOAD_DIR, safeSegment(collection), safeSegment(recordId));
  await mkdir(dir, { recursive: true });

  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 10);
  const name = `${safeSegment(field)}-${digest}${ALLOWED[detected]}`;
  await writeFile(join(dir, name), buffer);

  return {
    path: `${UPLOAD_URL_PREFIX}/${safeSegment(collection)}/${safeSegment(recordId)}/${name}`,
    bytes: file.size,
    type: detected
  };
}

/** True for values this module owns, as opposed to a legacy `assets/...` path. */
export function isManaged(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(UPLOAD_URL_PREFIX + '/');
}

/**
 * Resolve a public path to a file on disk, refusing anything outside the root.
 *
 * The check is on the resolved absolute path rather than on the input string,
 * because encoded traversal and symlinked segments both survive naive
 * inspection of the text.
 */
export function resolveOnDisk(relative: string): string | null {
  const cleaned = normalize(relative).replace(/^([/\\])+/, '');
  const full = resolve(UPLOAD_DIR, cleaned);
  if (full !== UPLOAD_DIR && !full.startsWith(UPLOAD_DIR + sep)) return null;
  return existsSync(full) ? full : null;
}

export function contentTypeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  const found = Object.entries(ALLOWED).find(([, e]) => e === ext);
  return found ? found[0] : 'application/octet-stream';
}

/** Remove one managed file. Silent when it is already gone. */
export async function remove(publicPath: string): Promise<void> {
  if (!isManaged(publicPath)) return;
  const onDisk = resolveOnDisk(publicPath.slice(UPLOAD_URL_PREFIX.length));
  if (onDisk) await rm(onDisk, { force: true });
}

/** Remove a whole record's folder, used when the record itself is deleted. */
export async function removeRecordFolder(collection: string, recordId: string): Promise<void> {
  try {
    const dir = join(UPLOAD_DIR, safeSegment(collection), safeSegment(recordId));
    if (dir.startsWith(UPLOAD_DIR + sep)) await rm(dir, { recursive: true, force: true });
  } catch {
    // A failed cleanup must never block deleting the record itself.
  }
}

/** Files currently in a record's folder — used by the orphan check in tests. */
export async function listRecordFiles(collection: string, recordId: string): Promise<string[]> {
  try {
    const dir = join(UPLOAD_DIR, safeSegment(collection), safeSegment(recordId));
    return await readdir(dir);
  } catch {
    return [];
  }
}

/** Unique token for cache-busting a replaced image at the same path. */
export function cacheToken(): string {
  return randomBytes(4).toString('hex');
}
