import { COLLECTIONS, NAV_ORDER } from '$lib/collections';
import { countRecords } from '$lib/server/content';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  /**
   * Counts in the nav, so the sidebar answers "is there anything in here?"
   * without a click. Ten head-only counts in parallel — cheap, and it is the
   * first thing that tells you whether the seed actually landed.
   */
  const counts = await Promise.all(
    NAV_ORDER.map(async (key) => {
      try {
        return [key, await countRecords(locals.supabase, COLLECTIONS[key])] as const;
      } catch {
        // A missing table or a denied policy must not blank the whole shell.
        return [key, null] as const;
      }
    })
  );

  return {
    counts: Object.fromEntries(counts) as Record<string, number | null>,
    email: locals.user?.email ?? null
  };
};
