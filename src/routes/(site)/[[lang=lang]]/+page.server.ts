import { getPublishedPage } from '$lib/server/pages';
import { resolveCollections } from '$lib/server/page-content';
import { listEvents, listJournal } from '$lib/server/site';
import type { PageServerLoad } from './$types';

/**
 * The homepage is the `home` page record, like every other configured page.
 *
 * It only gets its own route file rather than falling through to [slug] because
 * the slug is empty here; the rendering is identical. The events and journal
 * previews come from `collection` sections on that record, so what appears on
 * the homepage is a backoffice decision rather than a code one.
 */
export const load: PageServerLoad = async ({ locals, parent }) => {
  const { locale } = await parent();
  const page = await getPublishedPage(locals.supabase, 'home', locale);

  if (!page) {
    // No home record configured: fall back to something honest rather than a
    // blank page, so an install that has not been seeded still works.
    const [events, posts] = await Promise.all([
      listEvents(locals.supabase, locale),
      listJournal(locals.supabase, locale)
    ]);
    return { page: null, collections: {}, events: events.slice(0, 3), posts: posts.slice(0, 3) };
  }

  return {
    page,
    collections: await resolveCollections(locals.supabase, page.sections),
    events: [],
    posts: []
  };
};
