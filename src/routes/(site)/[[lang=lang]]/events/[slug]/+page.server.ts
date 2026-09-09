import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { getEvent } from '$lib/server/site';
import { getPublishedPage } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const { locale } = await parent();
  const event = await getEvent(locals.supabase, params.slug);
  if (!event) error(404, 'Deze editie bestaat niet.');

  /* Every edition shares its chrome — the section labels, the waitlist card's
     copy, the contact band. That lives on one template page rather than being
     repeated on each event, so changing "Praktisch" is one edit, not four. */
  const chrome = await getPublishedPage(locals.supabase, 'event-detail', locale);

  return {
    event,
    chrome,
    locale,
    /**
     * The waitlist form posts to the live Netlify function, which lives in the
     * static site's repo — not here. 04-INTEGRATIONS.md is emphatic that these
     * endpoints keep running where they are and must not be rebuilt, so this
     * renders the form and points it at the real one. Unset, the page says so
     * rather than showing a form that silently goes nowhere.
     */
    /* Our own route by default. The variable stays as an override for a
       deployment that wants to post somewhere else — it used to be required,
       because the endpoint lived in the static site's repository. */
    subscribeEndpoint: env.PUBLIC_SUBSCRIBE_ENDPOINT || '/api/subscribe',
    boxOffice: env.PUBLIC_TICKET_TAILOR_BOX_OFFICE ?? '',
    staticBase: env.PUBLIC_STATIC_SITE_BASE ?? ''
  };
};
