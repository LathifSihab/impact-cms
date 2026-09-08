import { listJournal } from '$lib/server/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  return { posts: await listJournal(locals.supabase, locale) };
};
