import { env } from '$env/dynamic/public';
import { allSlugs } from '$lib/server/site';
import type { RequestHandler } from './$types';

/**
 * A sitemap for the routes this app renders — the Python pipeline writes one for
 * the static pages, and the two do not know about each other. If the CMS ever
 * takes over the whole site, merge them rather than serving both.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const base = (env.PUBLIC_SITE_URL || url.origin).replace(/\/$/, '');
  const { events, journal } = await allSlugs(locals.supabase);

  const paths = [
    '/',
    '/events',
    '/journal',
    ...events.map((s) => `/events/${s}`),
    ...journal.map((s) => `/journal/${s}`)
  ];
  // Every path exists in both languages.
  const all = [...paths, ...paths.map((p) => `/en${p === '/' ? '' : p}`)];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((p) => `  <url><loc>${base}${p || '/'}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' }
  });
};
