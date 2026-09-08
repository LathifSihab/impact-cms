import { error } from '@sveltejs/kit';
import { getJournalPost } from '$lib/server/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const { locale } = await parent();
  const post = await getJournalPost(locals.supabase, params.slug);
  if (!post) error(404, 'Dit artikel bestaat niet.');
  return { post, locale };
};
