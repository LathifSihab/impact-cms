import { error, fail, redirect } from '@sveltejs/kit';
import { deletePage, getPage, pageLocales, savePage } from '$lib/server/pages';
import { isSystemPage } from '$lib/pages';
import { removeRecordFolder } from '$lib/server/uploads';
import { parseSections } from '$lib/server/page-form';
import { cleanupOrphans } from '$lib/server/form-uploads';
import { UploadError, isManaged, save } from '$lib/server/uploads';
import type { Actions, PageServerLoad } from './$types';

const asLocale = (v: string | null): 'nl' | 'en' => (v === 'en' ? 'en' : 'nl');

export const load: PageServerLoad = async ({ params, url, locals }) => {
  const locale = asLocale(url.searchParams.get('locale'));
  const locales = await pageLocales(locals.supabase, params.id);
  if (locales.length === 0) error(404, 'Deze pagina bestaat niet.');

  const page = await getPage(locals.supabase, params.id, locale);
  const dutch = locale === 'en' ? await getPage(locals.supabase, params.id, 'nl') : null;

  /* Opening a language that does not exist yet is how it gets created: the form
     starts from the Dutch row so the editor is translating rather than typing a
     page from nothing, and saving writes the new row. */
  const draft =
    page ??
    (dutch
      ? { ...dutch, locale, sections: dutch.sections.map((s) => ({ ...s })) }
      : error(404, 'Deze pagina bestaat niet.'));

  return { page: draft, locale, locales, exists: !!page, canDelete: !isSystemPage(params.id) };
};

export const actions: Actions = {
  save: async ({ params, request, url, locals }) => {
    const form = await request.formData();
    const locale = asLocale(String(form.get('locale') ?? url.searchParams.get('locale')));
    const errors: Record<string, string> = {};
    const orphaned: string[] = [];

    const str = (k: string) => String(form.get(k) ?? '').trim();
    /* The trust list is one item per line in the textarea. */
    /* Row editors post their state as JSON under <name>__rows, the same shape
       the section editor uses. */
    const rows = <C extends string>(k: string, cols: readonly C[]): Record<C, string>[] => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(form.get(`${k}__rows`) ?? '[]'));
      } catch {
        parsed = [];
      }
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((r) => {
          const src = (r ?? {}) as Record<string, unknown>;
          const out = {} as Record<C, string>;
          for (const col of cols) out[col] = String(src[col] ?? '').trim();
          return out;
        })
        .filter((r) => Object.values(r).some(Boolean));
    };

    const lines = (k: string) =>
      String(form.get(k) ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    /* The hero still, and the optional aftermovie behind it. Three uploads
       that behave identically, so they run through one helper rather than
       three copies of it drifting apart. */
    const heroUpload = async (field: string, slot: string): Promise<string> => {
      let current = str(field);
      const file = form.get(`${field}__file`);
      const cleared = form.get(`${field}__clear`) != null;

      if (file && typeof file === 'object' && (file as File).size > 0) {
        try {
          const saved = await save('pages', `${params.id}-${locale}`, slot, file as File);
          if (current && current !== saved.path && isManaged(current)) orphaned.push(current);
          return saved.path;
        } catch (e) {
          errors[field] = e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
          return current;
        }
      }
      if (cleared) {
        if (current && isManaged(current)) orphaned.push(current);
        return '';
      }
      return current;
    };

    const heroImage = await heroUpload('hero_image', 'hero');
    const heroVideoWebm = await heroUpload('hero_video_webm', 'hero-video-webm');
    const heroVideoMp4 = await heroUpload('hero_video_mp4', 'hero-video-mp4');

    const navLabel = str('nav_label');
    if (!navLabel) errors.nav_label = 'Dit veld is verplicht.';
    const heroTitle = str('hero_title');
    if (!heroTitle) errors.hero_title = 'Dit veld is verplicht.';

    const sortRaw = str('sort_order');
    const sortOrder = sortRaw ? Number(sortRaw) : 0;
    if (!Number.isFinite(sortOrder)) errors.sort_order = 'Vul een geldig getal in.';

    const parsed = await parseSections(`${params.id}-${locale}`, form);
    Object.assign(errors, parsed.errors);
    orphaned.push(...parsed.orphaned);

    if (Object.keys(errors).length) return fail(400, { errors });

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
          heroVideoWebm,
          heroVideoMp4,
          heroVariant: str('hero_variant') || 'page',
          heroTrust: lines('hero_trust'),
          heroAnchorNav: rows('hero_anchor_nav', ['label', 'href'] as const),
          heroOverlayMeta: rows('hero_overlay_meta', ['heading', 'body'] as const),
          heroCtaLabel: str('hero_cta_label'),
          heroCtaHref: str('hero_cta_href'),
          heroCta2Label: str('hero_cta2_label'),
          heroCta2Href: str('hero_cta2_href'),
          seo: { title: str('seo_title'), description: str('seo_description') },
          published: form.get('published') != null,
          isTemplate: form.get('is_template') != null,
          locale
        },
        parsed.sections
      );
      await cleanupOrphans(orphaned);
    } catch (e) {
      const err = e as { message?: string };
      return fail(400, { problem: { message: 'Opslaan is niet gelukt.', detail: err.message } });
    }

    return { saved: true };
  },

  delete: async ({ params, request, url, locals }) => {
    const form = await request.formData();
    const locale = String(form.get('locale') ?? url.searchParams.get('locale')) === 'en' ? 'en' : 'nl';

    /* Checked on the server, not just hidden in the UI: home, events, journal
       and event-detail are read by route files, so removing one would leave a
       route pointing at nothing. */
    if (isSystemPage(params.id)) {
      return fail(400, {
        problem: {
          message: 'Deze pagina hoort bij een vaste route en kan niet verwijderd worden.',
          detail: undefined
        }
      });
    }

    try {
      await deletePage(locals.supabase, params.id, locale);
      await removeRecordFolder('pages', `${params.id}-${locale}`);
    } catch (e) {
      const err = e as { message?: string };
      return fail(400, { problem: { message: 'Verwijderen is niet gelukt.', detail: err.message } });
    }

    redirect(303, '/admin/pages');
  }
};
