import { env } from '$env/dynamic/public';
import type { Locale } from '$lib/collections';
import { publishedSlugs } from '$lib/server/pages';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
  // The matcher only admits 'en', so anything else is the Dutch default.
  const locale: Locale = params.lang === 'en' ? 'en' : 'nl';

  return {
    locale,
    /**
     * Where the pages this app does not render still live. Only Events and
     * Journal come from the CMS; Over, Samenwerken, Contact and the rest are
     * still the static build, so the nav points at it rather than at dead
     * relative links.
     */
    slugs: await publishedSlugs(locals.supabase)
  };
};
