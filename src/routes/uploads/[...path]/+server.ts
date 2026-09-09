import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { contentTypeFor, ensureVariant, resolveOnDisk } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

/**
 * Serve uploaded files.
 *
 * This route exists because static/ is copied into the build output when the
 * adapter runs, so a file written at runtime would never be served from there.
 *
 * Public: these are the images on the public site. Path traversal is refused by
 * resolveOnDisk, which checks the resolved absolute path rather than the string.
 */
export const GET: RequestHandler = async ({ params, setHeaders }) => {
  /* Variants are normally written when the image is uploaded. A miss here means
     the ladder changed, the encoder failed that once, or the file predates the
     backfill — so build the one that was asked for rather than 404ing and
     leaving the browser to fall back to the full-size original. */
  const onDisk = resolveOnDisk(params.path) ?? (await ensureVariant(params.path));
  if (!onDisk) error(404, 'Niet gevonden.');

  const info = await stat(onDisk);
  if (!info.isFile()) error(404, 'Niet gevonden.');

  setHeaders({
    'content-type': contentTypeFor(onDisk),
    'content-length': String(info.size),
    // Filenames carry a content hash, so a changed image is a changed URL and
    // this can be cached hard.
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff'
  });

  return new Response(Readable.toWeb(createReadStream(onDisk)) as ReadableStream);
};
