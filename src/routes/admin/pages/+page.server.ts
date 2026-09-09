import { listPages } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
  pages: await listPages(locals.supabase)
});
