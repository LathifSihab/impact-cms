/**
 * Request-scoped Supabase client + the auth guard.
 *
 * Auth is Supabase Auth, not hand-rolled. 07-DECISIONS.md is explicit about why:
 * this system holds children's first names and ages, and a bespoke session
 * implementation is the wrong place to be original.
 *
 * The guard fails closed — everything except /login and /auth requires a user.
 */

import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

const PUBLIC_ROUTES = ['/login', '/auth'];

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    env.PUBLIC_SUPABASE_URL ?? '',
    env.PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) {
            event.cookies.set(name, value, { ...options, path: '/' });
          }
        }
      }
    }
  );

  /**
   * getSession() alone reads the cookie and trusts it. getUser() asks the auth
   * server whether the JWT is actually valid. The project's own lesson — "a 200
   * is not proof, check the far side" — applies to auth more than anywhere else,
   * so the session is only handed on once the user behind it is verified.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    if (error || !user) return { session: null, user: null };

    return { session, user };
  };

  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  const isPublic = PUBLIC_ROUTES.some(
    (p) => event.url.pathname === p || event.url.pathname.startsWith(p + '/')
  );

  if (!user && !isPublic) {
    const next = event.url.pathname + event.url.search;
    redirect(303, `/login?next=${encodeURIComponent(next)}`);
  }
  if (user && event.url.pathname === '/login') {
    redirect(303, '/');
  }

  return resolve(event, {
    // Supabase's auth cookies must survive the filter SvelteKit applies to
    // headers on serialised responses.
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });
};
