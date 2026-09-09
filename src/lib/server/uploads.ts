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
import { extname } from 'node:path';
import { env } from '$env/dynamic/private';
import { storage, publicUrlFor, uploadDir, backend } from './storage';
import { intrinsicWidth, isConvertible, LADDER, MAX_WIDTH, VARIANT_FORMATS } from '../images';
import { generate, normalise } from './variants';

export { uploadDir, backend };

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
  'image/gif': '.gif',
  'video/webm': '.webm',
  'video/mp4': '.mp4'
};

const IS_VIDEO = (type: string) => type.startsWith('video/');

/* Video is allowed for the participant reel, and a clip is an order of
   magnitude larger than a photo, so the ceiling depends on what was uploaded
   rather than being one number that is wrong for one of them. */
export const MAX_BYTES = Number(env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024);
export const MAX_VIDEO_BYTES = Number(env.UPLOAD_MAX_VIDEO_BYTES ?? 64 * 1024 * 1024);

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
  // Matroska/WebM starts with the EBML magic.
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  // AVIF: 'ftyp' at offset 4, brand at 8
  const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7]);
  const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
  if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis')) return 'image/avif';
  // Every other ftyp brand here is an MP4 family container: isom, mp42, iso5…
  if (ftyp === 'ftyp') return 'video/mp4';
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

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = sniff(buffer);
  if (!detected || !ALLOWED[detected]) {
    throw new UploadError('Alleen JPG, PNG, WebP, AVIF, GIF, WebM of MP4.');
  }

  const ceiling = IS_VIDEO(detected) ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size > ceiling) {
    throw new UploadError(`Maximaal ${Math.floor(ceiling / (1024 * 1024))} MB voor dit bestandstype.`);
  }

  const folder = `${safeSegment(collection)}/${safeSegment(recordId)}`;
  const ext = ALLOWED[detected];

  /* A photo is downscaled to the widest size the site ever renders, and its
     intrinsic width goes into the filename. That width is what lets the
     renderer build a srcset during SSR without touching the disk — see
     src/lib/images.ts for the convention. */
  let stored: Uint8Array<ArrayBufferLike> = buffer;
  let width: number | null = null;
  if (isConvertible(ext)) {
    const normalised = await normalise(buffer, ext);
    if (normalised) {
      stored = normalised.bytes;
      width = normalised.width;
    }
  }

  const digest = createHash('sha256').update(stored).digest('hex').slice(0, 10);
  const base = `${safeSegment(field)}-${digest}`;
  const name = width ? `${base}-${width}${ext}` : `${base}${ext}`;
  const key = `${folder}/${name}`;
  await storage.put(key, stored, detected);

  /* Generating the ladder now keeps the first visitor off the slow path. It is
     deliberately not awaited into the failure path: if the encoder gives up,
     the upload still succeeded and the image still renders, just at one size. */
  if (width) await generate(key, width);

  return {
    path: `${UPLOAD_URL_PREFIX}/${key}`,
    bytes: stored.byteLength,
    type: detected
  };
}

/** True for values this module owns, as opposed to a legacy `assets/...` path. */
export function isManaged(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(UPLOAD_URL_PREFIX + '/');
}

/** Strip the /uploads prefix and any leading slash: the storage key. */
export function keyFor(publicPathOrRelative: string): string {
  const withoutPrefix = publicPathOrRelative.startsWith(UPLOAD_URL_PREFIX + '/')
    ? publicPathOrRelative.slice(UPLOAD_URL_PREFIX.length)
    : publicPathOrRelative;
  const cleaned = withoutPrefix.replace(/^\/+/, '');
  // Traversal is refused here rather than deeper: a key never contains "..".
  return cleaned.split('/').some((seg) => seg === '..' || seg === '.') ? '' : cleaned;
}

/** The bytes behind a stored path, or null. */
export async function read(publicPathOrKey: string): Promise<Uint8Array | null> {
  const key = keyFor(publicPathOrKey);
  return key ? storage.get(key) : null;
}

/** True when a stored path has something behind it. */
export async function has(publicPathOrKey: string): Promise<boolean> {
  const key = keyFor(publicPathOrKey);
  return key ? storage.exists(key) : false;
}

/** The URL a browser should fetch this stored path from. */
export function publicUrl(publicPathOrKey: string): string {
  const key = keyFor(publicPathOrKey);
  return key ? publicUrlFor(key) : '';
}

export function contentTypeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  const found = Object.entries(ALLOWED).find(([, e]) => e === ext);
  return found ? found[0] : 'application/octet-stream';
}

/**
 * Build one missing variant on request.
 *
 * The path is `<stem>-<intrinsic>.<width>.<format>`, and both the width and the
 * format have to be ones we would have generated ourselves — otherwise this is
 * an open image-resizing service, and anyone could spend the server's CPU by
 * asking for ten thousand arbitrary sizes.
 */
export async function ensureVariant(requested: string): Promise<string | null> {
  const m = keyFor(requested).match(/^(.*)\.(\d{2,5})\.(avif|webp)$/i);
  if (!m) return null;

  const [, stem, widthText, format] = m;
  const width = Number(widthText);
  if (!VARIANT_FORMATS.includes(format.toLowerCase() as (typeof VARIANT_FORMATS)[number])) {
    return null;
  }

  // The original keeps its own extension, so try each one we accept.
  let original = '';
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.avif']) {
    if (await storage.exists(stem + ext)) {
      original = stem + ext;
      break;
    }
  }
  if (!original) return null;

  const intrinsic = intrinsicWidth(original);
  if (!intrinsic) return null;

  // Only a rung of the ladder this original actually has.
  const ceiling = Math.min(intrinsic, MAX_WIDTH);
  const allowed = width === ceiling || (LADDER.includes(width) && width < ceiling);
  if (!allowed) return null;

  const written = await generate(original, intrinsic, { width, format: format.toLowerCase() });
  return written > 0 ? keyFor(requested) : null;
}

/**
 * Remove one managed file, and the variant ladder generated from it.
 *
 * Forgetting the ladder would leave six or twelve orphans behind every replaced
 * image, which on a site with this much photography adds up quickly.
 */
export async function remove(publicPath: string): Promise<void> {
  if (!isManaged(publicPath)) return;
  const key = keyFor(publicPath);
  if (!key) return;
  await storage.del(key);

  const intrinsic = intrinsicWidth(key);
  if (!intrinsic) return;

  const stem = key.replace(/\.[a-z0-9]+$/i, '');
  for (const width of [...LADDER, Math.min(intrinsic, MAX_WIDTH)]) {
    for (const format of VARIANT_FORMATS) {
      await storage.del(`${stem}.${width}.${format}`);
    }
  }
}

/** Remove a whole record's folder, used when the record itself is deleted. */
export async function removeRecordFolder(collection: string, recordId: string): Promise<void> {
  try {
    await storage.removePrefix(`${safeSegment(collection)}/${safeSegment(recordId)}`);
  } catch {
    // A failed cleanup must never block deleting the record itself.
  }
}

/** Files currently in a record's folder — used by the orphan check in tests. */
export async function listRecordFiles(collection: string, recordId: string): Promise<string[]> {
  try {
    return await storage.list(`${safeSegment(collection)}/${safeSegment(recordId)}`);
  } catch {
    return [];
  }
}

/** Unique token for cache-busting a replaced image at the same path. */
export function cacheToken(): string {
  return randomBytes(4).toString('hex');
}
