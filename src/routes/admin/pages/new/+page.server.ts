import { fail, redirect } from '@sveltejs/kit';
import { getPage, savePage } from '$lib/server/pages';
import type { Actions } from './$types';

/** Same slug rule as the content types: it is a URL segment. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const actions: Actions = {
  save: async ({ request, locals }) => {
    const form = await request.formData();
    const str = (k: string) => String(form.get(k) ?? '').trim();

    const id = str('id').toLowerCase();
    const navLabel = str('nav_label');
    const heroTitle = str('hero_title');
    const locale = str('locale') === 'en' ? 'en' : 'nl';

    const errors: Record<string, string> = {};
    if (!id) errors.id = 'Dit veld is verplicht.';
    else if (!SLUG.test(id)) errors.id = 'Gebruik alleen kleine letters, cijfers en koppeltekens.';
    if (!navLabel) errors.nav_label = 'Dit veld is verplicht.';
    if (!heroTitle) errors.hero_title = 'Dit veld is verplicht.';

    // savePage upserts, so without this a new page would silently overwrite one
    // that already exists under the same slug.
    if (!errors.id && (await getPage(locals.supabase, id, locale))) {
      errors.id = 'Er bestaat al een pagina met dit adres in deze taal.';
    }

    if (Object.keys(errors).length) {
      return fail(400, { errors, values: { id, nav_label: navLabel, hero_title: heroTitle, locale } });
    }

    try {
      await savePage(
        locals.supabase,
        id,
        {
          navLabel,
          sortOrder: Number(str('sort_order')) || 50,
          heroLabel: '',
          heroTitle,
          heroIntro: '',
          heroImage: null,
        heroAnchorNav: [],
        heroOverlayMeta: [],
        heroVideoWebm: '',
        heroVideoMp4: '',
          heroVariant: 'page',
          heroTrust: [],
          heroCtaLabel: '',
          heroCtaHref: '',
          heroCta2Label: '',
          heroCta2Href: '',
          seo: { title: '', description: '' },
          // New pages start hidden: an empty page should not appear on the site
          // the moment it is created.
          published: false,
          isTemplate: false,
          locale
        },
        []
      );
    } catch (e) {
      const err = e as { message?: string };
      return fail(400, { problem: { message: 'Aanmaken is niet gelukt.', detail: err.message } });
    }

    redirect(303, `/admin/pages/${id}?locale=${locale}&created=1`);
  }
};
