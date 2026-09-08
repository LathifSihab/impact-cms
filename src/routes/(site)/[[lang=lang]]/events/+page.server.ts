import { env } from '$env/dynamic/public';
import { listEvents, listFormats } from '$lib/server/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  const [events, formats] = await Promise.all([
    listEvents(locals.supabase, locale),
    listFormats(locals.supabase)
  ]);
  return { events, formats, boxOffice: env.PUBLIC_TICKET_TAILOR_BOX_OFFICE ?? '' };
};
