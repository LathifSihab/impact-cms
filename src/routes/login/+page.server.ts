import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
  next: url.searchParams.get('next') ?? '/admin',
  // Surfaced in the UI rather than thrown, so a misconfigured deploy says what is
  // wrong instead of failing with a blank page — the project has lost hours to
  // exactly this (see 07-DECISIONS.md on environment variables).
  configured: Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY)
});

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const next = String(form.get('next') ?? '/admin') || '/admin';

    if (!email || !password) {
      return fail(400, { email, error: 'Vul je e-mailadres en wachtwoord in.' });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Deliberately does not distinguish "no such account" from "wrong
      // password": that difference tells an attacker which addresses are staff.
      return fail(401, { email, error: 'Deze combinatie klopt niet.' });
    }

    // Only ever redirect to a path on this origin.
    const target = next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
    redirect(303, new URL(target, url.origin).pathname + new URL(target, url.origin).search);
  }
};
