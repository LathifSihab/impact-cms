import { error, redirect } from '@sveltejs/kit';
import { contentTypeFor, ensureVariant, has, publicUrl, read } from '$lib/server/uploads';
import { backend } from '$lib/server/storage';
import type { RequestHandler } from './$types';

/**
 * Serve uploaded files.
 *
 * This route exists because static/ is copied into the build output when the
 * adapter runs, so a file written at runtime would never be served from there.
 *
 * With Supabase Storage the bytes are on a CDN and the pages already point
 * straight at it, so this route is a fallback: old links, and the on-demand
 * variant path. It redirects rather than proxying, because streaming every
 * image through a serverless function is the cost that moving to Storage was
 * meant to remove.
 *
 * Public: these are the images on the public site. Traversal is refused by
 * keyFor, which rejects any key containing a relative segment.
 */
export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const path = params.path;

  /* Variants are normally written when the image is uploaded. A miss here means
     the ladder changed, the encoder failed that once, or the file predates the
     backfill — so build the one that was asked for rather than 404ing and
     leaving the browser to fall back to the full-size original. */
  let found = await has(path);
  if (!found) found = Boolean(await ensureVariant(path));
  if (!found) error(404, 'Niet gevonden.');

  if (backend() === 'supabase') {
    // 301: the key carries a content hash, so this mapping never changes.
    redirect(301, publicUrl(path));
  }

  const bytes = await read(path);
  if (!bytes) error(404, 'Niet gevonden.');

  setHeaders({
    'content-type': contentTypeFor(path),
    'content-length': String(bytes.byteLength),
    // Filenames carry a content hash, so a changed image is a changed URL and
    // this can be cached hard.
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff'
  });

  return new Response(bytes as unknown as BodyInit);
};
