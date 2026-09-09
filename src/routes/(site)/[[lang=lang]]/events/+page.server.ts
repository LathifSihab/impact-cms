import { env } from '$env/dynamic/public';
import { listEvents, listFormats } from '$lib/server/site';
import { getPublishedPage } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

/**
 * The list comes from the events content type; the copy around it comes from
 * the `events` page in Page Configuration. Records live in Inhoud, page copy
 * lives in Pagina's — the same rule everywhere.
 */
export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  const [events, formats, page] = await Promise.all([
    listEvents(locals.supabase, locale),
    listFormats(locals.supabase),
    getPublishedPage(locals.supabase, 'events', locale)
  ]);
  return { events, formats, page, boxOffice: env.PUBLIC_TICKET_TAILOR_BOX_OFFICE ?? '' };
};
