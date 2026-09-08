import type { Locale } from '$lib/collections';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
  // The matcher only admits 'en', so anything else is the Dutch default.
  const locale: Locale = params.lang === 'en' ? 'en' : 'nl';
  return { locale };
};
