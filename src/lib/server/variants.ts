/**
 * Generating the responsive copies of an uploaded image.
 *
 * Sharp is the only native dependency in the project, so it is confined to this
 * module and loaded lazily: a host where the binary will not install still runs
 * the CMS, it just serves single-size images. Every entry point here treats a
 * failure as "no variants" rather than an error, because a photo that uploaded
 * fine must not be rejected because the encoder had a bad day.
 *
 * Quality settings are chosen to sit under the static site's own files at the
 * same widths: AVIF 50 is visually transparent for photography, and effort 3
 * keeps a six-width ladder under a couple of seconds on a laptop.
 */

import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { isConvertible, ladderFor, MAX_WIDTH, VARIANT_FORMATS } from '../images.ts';

const AVIF = { quality: 50, effort: 3 } as const;
const WEBP = { quality: 74, effort: 4 } as const;

type Sharp = (typeof import('sharp'))['default'];

let cached: Promise<Sharp | null> | null = null;

/** Load sharp once, and remember that it is unavailable rather than retrying. */
async function loadSharp(): Promise<Sharp | null> {
  if (!cached) {
    cached = import('sharp')
      .then((m) => m.default ?? (m as unknown as Sharp))
      .catch((e) => {
        console.warn('[variants] sharp is niet beschikbaar, afbeeldingen blijven één formaat:', e);
        return null;
      });
  }
  return cached;
}

/** The intrinsic width of an image buffer, or null if it cannot be read. */
export async function probeWidth(bytes: Uint8Array): Promise<number | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  try {
    const { width } = await sharp(Buffer.from(bytes)).metadata();
    return width && width > 0 ? width : null;
  } catch {
    return null;
  }
}

/**
 * Write the AVIF and WebP ladder beside an original that is already on disk.
 *
 * `intrinsic` is the original's own width, so nothing is ever upscaled: the
 * largest variant is the original's width, or MAX_WIDTH when it is larger.
 * Existing files are left alone, which makes a re-run cheap and lets the
 * on-demand route fill a single gap without redoing the whole ladder.
 */
export async function generate(
  originalPath: string,
  intrinsic: number,
  only?: { width: number; format: string }
): Promise<number> {
  const sharp = await loadSharp();
  if (!sharp) return 0;
  if (!isConvertible(originalPath)) return 0;

  const dir = dirname(originalPath);
  const stem = basename(originalPath, extname(originalPath));

  let bytes: Buffer;
  try {
    bytes = await readFile(originalPath);
  } catch {
    return 0;
  }

  const widths = only ? [only.width] : ladderFor(intrinsic);
  const formats = only ? [only.format] : [...VARIANT_FORMATS];
  let written = 0;

  for (const width of widths) {
    if (width > Math.min(intrinsic, MAX_WIDTH)) continue;

    for (const format of formats) {
      const target = join(dir, `${stem}.${width}.${format}`);
      // Already there: another save, an earlier run, or the on-demand route.
      if (await exists(target)) continue;

      try {
        const pipeline = sharp(bytes).resize({ width, withoutEnlargement: true });
        const out =
          format === 'avif' ? await pipeline.avif(AVIF).toBuffer() : await pipeline.webp(WEBP).toBuffer();
        await writeFile(target, out);
        written++;
      } catch (e) {
        // One bad width must not cost the rest of the ladder.
        console.warn(`[variants] ${basename(target)} overslaan:`, e);
      }
    }
  }

  return written;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downscale an original that is wider than we ever serve.
 *
 * Returns the bytes to store and their width. Oversized originals are the main
 * source of wasted disk here — a phone photo is routinely 4000px wide and no
 * layout in the site is more than 1296 CSS pixels across.
 */
export async function normalise(
  bytes: Uint8Array,
  ext: string
): Promise<{ bytes: Uint8Array; width: number } | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  if (!isConvertible(ext)) return null;

  try {
    const input = Buffer.from(bytes);
    const meta = await sharp(input).metadata();
    const width = meta.width ?? 0;
    if (!width) return null;
    if (width <= MAX_WIDTH) return { bytes, width };

    /* Re-encode in the format it arrived in, so the stored extension stays
       honest and `contentTypeFor` keeps working off the filename. */
    const pipeline = sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const out =
      ext === '.png'
        ? await pipeline.png().toBuffer()
        : ext === '.webp'
          ? await pipeline.webp({ quality: 82 }).toBuffer()
          : ext === '.avif'
            ? await pipeline.avif({ quality: 60 }).toBuffer()
            : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();

    return { bytes: new Uint8Array(out), width: MAX_WIDTH };
  } catch {
    return null;
  }
}
