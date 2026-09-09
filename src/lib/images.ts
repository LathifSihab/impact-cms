/**
 * Responsive image variants — the naming convention, shared by client and server.
 *
 * An uploaded photo is stored once at full size, and a ladder of smaller AVIF
 * and WebP copies is generated beside it. The renderer has to build a `srcset`
 * during SSR, where it cannot touch the filesystem, so the convention carries
 * the one fact it needs: the original's intrinsic width is part of its filename.
 *
 *   hero-a1b2c3d4e5-1600.jpg      the original, 1600px wide
 *   hero-a1b2c3d4e5-1600.640.avif a variant, 640px wide
 *   hero-a1b2c3d4e5-1600.640.webp
 *
 * Knowing the intrinsic width means the srcset only ever advertises widths that
 * were actually produced — no 404s, and no upscaled variant pretending to carry
 * detail it does not have.
 *
 * Files uploaded before this convention existed have no width suffix. They are
 * not an error: `variants()` returns null and the caller falls back to a plain
 * `<img>`, so nothing breaks while `npm run images:variants` catches them up.
 */

/** Widths generated for every image, clipped to the original's own width. */
export const LADDER = [420, 640, 900, 1280, 1920, 2560];

/** Nothing is stored larger than this; beyond it the original is downscaled. */
export const MAX_WIDTH = 2560;

/** Formats generated, best first — the browser takes the first it understands. */
export const VARIANT_FORMATS = ['avif', 'webp'] as const;
export type VariantFormat = (typeof VARIANT_FORMATS)[number];

/**
 * Where an image sits in the layout, which decides how wide it is rendered.
 *
 * The `sizes` strings are lifted from the static site so the browser makes the
 * same choice here as it does there.
 */
export const ROLES = {
  /** Full-bleed hero and other edge-to-edge media. */
  wide: '(max-width: 820px) 100vw, (max-width: 1180px) 92vw, 1296px',
  /** Cards in a grid or a scrolling strip. */
  card: '(max-width: 820px) 78vw, 420px',
  /** Portraits and logos, which never grow large. */
  portrait: '(max-width: 820px) 78vw, 420px'
} as const;

export type ImageRole = keyof typeof ROLES;

/* Only raster photos get a ladder. GIF is excluded because it may be animated
   and a still frame is not the same picture; video is not an image at all. */
const CONVERTIBLE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * The intrinsic width recorded in a filename, or null when there is none.
 *
 * Bounded to 2–5 digits so it cannot match the ten hex characters of the
 * content hash, which for an unlucky file could be all digits.
 */
export function intrinsicWidth(src: string): number | null {
  const m = src.match(/-(\d{2,5})\.[a-z0-9]+$/i);
  return m ? Number(m[1]) : null;
}

/** The name an original takes once its width is known. */
export function withWidth(baseName: string, width: number, ext: string): string {
  return `${baseName}-${width}${ext}`;
}

/** The widths actually generated for an original of this width. */
export function ladderFor(width: number): number[] {
  const capped = Math.min(width, MAX_WIDTH);
  const steps = LADDER.filter((w) => w < capped);
  return [...steps, capped];
}

export interface Variants {
  /** One `srcset` per format, in the order they should be offered. */
  sources: { type: string; srcset: string }[];
  sizes: string;
}

/**
 * Build the `<picture>` sources for a stored image path.
 *
 * Returns null when the image has no variants — a legacy upload, a GIF, an
 * external URL — and the caller should render a plain `<img>` instead.
 */
export function variants(src: string, role: ImageRole = 'card'): Variants | null {
  if (!src || /^(https?:)?\/\//.test(src)) return null;
  if (!src.startsWith('/uploads/')) return null;
  if (!CONVERTIBLE.test(src)) return null;

  const width = intrinsicWidth(src);
  if (!width) return null;

  // Strip the extension; variants hang off the full name including the width.
  const stem = src.replace(/\.[a-z0-9]+$/i, '');
  const widths = ladderFor(width);
  if (widths.length === 0) return null;

  return {
    sources: VARIANT_FORMATS.map((fmt) => ({
      type: `image/${fmt}`,
      srcset: widths.map((w) => `${stem}.${w}.${fmt} ${w}w`).join(', ')
    })),
    sizes: ROLES[role]
  };
}

/** True when this path is one this module knows how to generate a ladder for. */
export function isConvertible(nameOrPath: string): boolean {
  return CONVERTIBLE.test(nameOrPath);
}
