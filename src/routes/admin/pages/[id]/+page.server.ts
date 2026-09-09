import { error, fail } from '@sveltejs/kit';
import { getPage, savePage } from '$lib/server/pages';
import { parseSections } from '$lib/server/page-form';
import { cleanupOrphans } from '$lib/server/form-uploads';
import { UploadError, isManaged, save } from '$lib/server/uploads';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const page = await getPage(locals.supabase, params.id);
  if (!page) error(404, 'Deze pagina bestaat niet.');
  return { page };
};

export const actions: Actions = {
  save: async ({ params, request, locals }) => {
    const form = await request.formData();
    const errors: Record<string, string> = {};
    const orphaned: string[] = [];

    const str = (k: string) => String(form.get(k) ?? '').trim();

    /* The hero image is a plain image field on the page itself, so it goes
       through the same upload path everything else uses. */
    let heroImage = str('hero_image');
    const heroFile = form.get('hero_image__file');
    const heroCleared = form.get('hero_image__clear') != null;
    if (heroFile && typeof heroFile === 'object' && (heroFile as File).size > 0) {
      try {
        const saved = await save('pages', params.id, 'hero', heroFile as File);
        if (heroImage && heroImage !== saved.path && isManaged(heroImage)) orphaned.push(heroImage);
        heroImage = saved.path;
      } catch (e) {
        errors.hero_image = e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
      }
    } else if (heroCleared) {
      if (heroImage && isManaged(heroImage)) orphaned.push(heroImage);
      heroImage = '';
    }

    const navLabel = str('nav_label');
    if (!navLabel) errors.nav_label = 'Dit veld is verplicht.';
    const heroTitle = str('hero_title');
    if (!heroTitle) errors.hero_title = 'Dit veld is verplicht.';

    const sortRaw = str('sort_order');
    const sortOrder = sortRaw ? Number(sortRaw) : 0;
    if (!Number.isFinite(sortOrder)) errors.sort_order = 'Vul een geldig getal in.';

    const parsed = await parseSections(params.id, form);
    Object.assign(errors, parsed.errors);
    orphaned.push(...parsed.orphaned);

    if (Object.keys(errors).length) {
      return fail(400, { errors });
    }

    try {
      await savePage(
        locals.supabase,
        params.id,
        {
          navLabel,
          sortOrder,
          heroLabel: str('hero_label'),
          heroTitle,
          heroIntro: str('hero_intro'),
          heroImage: heroImage || null,
          heroVariant: str('hero_variant') || 'page',
          seo: { title: str('seo_title'), description: str('seo_description') },
          published: form.get('published') != null,
          locale: str('locale') === 'en' ? 'en' : 'nl'
        },
        parsed.sections
      );
      // Only once the row is written — a failed save must not delete an image
      // the page still points at.
      await cleanupOrphans(orphaned);
    } catch (e) {
      const err = e as { message?: string };
      return fail(400, { problem: { message: 'Opslaan is niet gelukt.', detail: err.message } });
    }

    return { saved: true };
  }
};
