import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Sign-out is a POST so a prefetch or a stray GET cannot end someone's session. */
export const POST: RequestHandler = async ({ locals }) => {
  await locals.supabase.auth.signOut();
  redirect(303, '/login');
};
