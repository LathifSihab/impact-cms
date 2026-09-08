import { listEvents, listJournal } from '$lib/server/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  const [events, posts] = await Promise.all([
    listEvents(locals.supabase, locale),
    listJournal(locals.supabase, locale)
  ]);
  return { events: events.slice(0, 3), posts: posts.slice(0, 3) };
};
