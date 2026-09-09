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
import { env as privateEnv } from '$env/dynamic/private';

/* Make the .env values visible to plain-node modules.
 *
 * lib/server/storage.ts reads process.env rather than $env, because the
 * maintenance scripts import it directly under node where SvelteKit's aliases
 * do not resolve. In production process.env already holds everything; in dev
 * Vite loads .env into $env only, so without this bridge the dev server would
 * silently choose a different storage backend from the one the scripts use —
 * and uploads would land on disk while the pages read from the bucket. */
for (const [key, value] of Object.entries({ ...privateEnv, ...env })) {
  if (value !== undefined && process.env[key] === undefined) process.env[key] = value;
}

/**
 * The backoffice lives entirely under /admin, and that prefix is the whole
 * access rule.
 *
 * This used to be the other way round — everything private except an allowlist —
 * which is the safer default when an app has no public face. It has one now: the
 * CMS renders /events and /journal for visitors, so a deny-by-default guard
 * would have to allowlist the public site instead, and every new public page
 * would be a 302 to the login screen until someone remembered to add it.
 *
 * Putting every authenticated route under one directory makes the rule
 * enforceable by where a file sits rather than by keeping a list in sync. Add a
 * backoffice route anywhere else and it is not protected — so do not.
 */
const ADMIN_PREFIX = '/admin';

/**
 * The two values without which nothing can run.
 *
 * createServerClient throws on empty strings, and it is called for every
 * request — so a missing variable takes out every route, including /login,
 * with Vercel's generic {"message":"Internal Error"} and nothing in the page
 * to say why. Checking first turns an hour of guessing into a page that names
 * the variable.
 */
function missingConfig(): string[] {
  return [
    ['PUBLIC_SUPABASE_URL', env.PUBLIC_SUPABASE_URL],
    ['PUBLIC_SUPABASE_ANON_KEY', env.PUBLIC_SUPABASE_ANON_KEY]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);
}

export const handle: Handle = async ({ event, resolve }) => {
  const missing = missingConfig();
  if (missing.length) {
    /* Names only, never values. A variable name is not a secret; the thing it
       holds is. */
    const lines = [
      'Deze omgeving is niet geconfigureerd.',
      '',
      'Ontbrekende omgevingsvariabelen:',
      ...missing.map((name) => '  ' + name),
      '',
      'Zet ze in de omgeving van de deploy en deploy opnieuw. Een waarde die je in',
      'het dashboard van de host aanpast, bereikt de app pas bij de volgende deploy',
      '- verversen van deze pagina verandert niets.',
      '',
      'Zie DEPLOYMENT.md, stap 9.'
    ];
    return new Response(lines.join(String.fromCharCode(10)) + String.fromCharCode(10), {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

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

  const path = event.url.pathname;
  const isAdmin = path === ADMIN_PREFIX || path.startsWith(ADMIN_PREFIX + '/');

  if (!user && isAdmin) {
    redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
  }
  if (user && path === '/login') {
    redirect(303, ADMIN_PREFIX);
  }

  const response = await resolve(event, {
    // Supabase's auth cookies must survive the filter SvelteKit applies to
    // headers on serialised responses.
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });

  /* Keep the backoffice out of search results from the app itself.
   *
   * vercel.json carries the same header, but the SvelteKit adapter writes its
   * own routing config into .vercel/output and the host's header rules do not
   * reach these routes — the header was simply absent on the deploy. Setting it
   * here does not depend on the host, so it survives moving off Vercel too. */
  if (isAdmin || path === '/login') {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }

  return response;
};
