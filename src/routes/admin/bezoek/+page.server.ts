import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

/**
 * Plausible's own dashboard, embedded.
 *
 * A shared link rather than a rebuilt UI. Plausible already answers "how many,
 * from where, which goals, over what period" better than a reimplementation
 * would, and a copy of it here would be a subset forever — every new question
 * the client asked would be a code change. The joined numbers that Plausible
 * *cannot* produce, because it does not know about our signups, stay on
 * Signalen where they belong.
 *
 * The link is read server-side and handed to the page. It is not secret in the
 * cryptographic sense — anyone with the URL can read the stats — but it is not
 * something to scatter either, and this page is behind the login.
 */
export const load: PageServerLoad = async () => {
  const raw = (env.PLAUSIBLE_SHARED_LINK ?? '').trim();

  /* Refuse anything that is not a Plausible share URL. The value comes from an
     environment variable, and an iframe is a good place to be careful about
     what a mistyped variable can point the browser at. */
  let url = '';
  let reason = '';
  if (!raw) {
    reason = 'Nog niet gekoppeld.';
  } else {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:') reason = 'De link moet https zijn.';
      else if (host !== 'plausible.io' && !host.endsWith('.plausible.io')) {
        reason = 'De link wijst niet naar plausible.io.';
      } else if (!parsed.pathname.startsWith('/share/')) {
        reason = 'Dit lijkt geen gedeelde link — die begint met /share/.';
      } else {
        /* auth=… is what makes the link work without a Plausible login, and
           embed=true strips the chrome that assumes a full browser tab. */
        parsed.searchParams.set('embed', 'true');
        parsed.searchParams.set('theme', 'light');
        url = parsed.toString();
      }
    } catch {
      reason = 'De link is geen geldige URL.';
    }
  }

  return { url, reason, configured: Boolean(url) };
};
