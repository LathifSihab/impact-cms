import { listJournal } from '$lib/server/site';
import { getPublishedPage } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  const [posts, page] = await Promise.all([
    listJournal(locals.supabase, locale),
    getPublishedPage(locals.supabase, 'journal', locale)
  ]);
  return { posts, page };
};
