import { error } from '@sveltejs/kit';
import { getPublishedPage } from '$lib/server/pages';
import { resolveCollections } from '$lib/server/page-content';
import type { PageServerLoad } from './$types';

/**
 * Any configured page: /over, /samenwerken, /contact and the rest.
 *
 * `events` and `journal` are static route segments, so SvelteKit matches those
 * files first and this only ever sees the slugs they do not claim.
 */
export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const { locale } = await parent();

  const page = await getPublishedPage(locals.supabase, params.slug);
  if (!page) error(404, 'Deze pagina bestaat niet.');

  return { page, locale, collections: await resolveCollections(locals.supabase, page.sections) };
};
