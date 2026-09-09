/**
 * Reading and writing configurable pages.
 *
 * A page is a row plus an ordered list of sections. Both halves are always
 * loaded and saved together, because that is how they are edited: nobody
 * changes one section in isolation, they open a page and press Save.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageInput, PageRecord, PageSection } from '$lib/pages';

export type { PageInput, PageRecord, PageSection };

type Row = Record<string, any>;

const toPage = (p: Row, sections: Row[] = []): PageRecord => ({
  id: p.id,
  locale: p.locale ?? 'nl',
  navLabel: p.nav_label ?? p.id,
  sortOrder: p.sort_order ?? 0,
  heroLabel: p.hero_label ?? '',
  heroTitle: p.hero_title ?? '',
  heroIntro: p.hero_intro ?? '',
  heroImage: p.hero_image ?? null,
  heroVariant: p.hero_variant ?? 'page',
  seo: p.seo ?? { title: '', description: '' },
  published: p.published !== false,
  isTemplate: p.is_template === true,
  updatedAt: String(p.updated_at ?? ''),
  sections: sections
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => ({
      id: s.id,
      position: s.position ?? 0,
      type: s.type,
      ground: s.ground ?? 'white',
      anchor: s.anchor ?? null,
      content: (s.content ?? {}) as Record<string, unknown>
    }))
});

export interface PageSummary extends Omit<PageRecord, 'sections'> {
  sectionCount: number;
  /** Which languages this slug exists in, so the list can say so. */
  locales: ('nl' | 'en')[];
}

/**
 * Every page for the list screen, one entry per slug.
 *
 * A page can exist in two languages and the list shows one row for it, with the
 * languages as a badge — eight pages listed twice would be a worse list, and the
 * editor switches language rather than the list.
 */
export async function listPages(db: SupabaseClient): Promise<PageSummary[]> {
  const { data, error } = await db
    .from('pages')
    .select('*, page_sections(count)')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;

  const bySlug = new Map<string, PageSummary>();
  for (const raw of (data ?? []) as Row[]) {
    const { sections, ...rest } = toPage(raw);
    void sections;
    const existing = bySlug.get(rest.id);
    const locale = rest.locale;

    if (!existing) {
      bySlug.set(rest.id, {
        ...rest,
        sectionCount: raw.page_sections?.[0]?.count ?? 0,
        locales: [locale]
      });
    } else {
      // Dutch is the source of truth for what the row shows.
      if (locale === 'nl') Object.assign(existing, rest);
      if (!existing.locales.includes(locale)) existing.locales.push(locale);
      if (locale === 'nl') existing.sectionCount = raw.page_sections?.[0]?.count ?? 0;
    }
  }

  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** One page in one language, exactly — no fallback. This is the editor. */
export async function getPage(
  db: SupabaseClient,
  id: string,
  locale: 'nl' | 'en' = 'nl'
): Promise<PageRecord | null> {
  const { data, error } = await db
    .from('pages')
    .select('*, page_sections(*)')
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Row;
  return toPage(row, (row.page_sections ?? []) as Row[]);
}

/** Which languages a slug exists in, for the editor's language tabs. */
export async function pageLocales(db: SupabaseClient, id: string): Promise<('nl' | 'en')[]> {
  const { data, error } = await db.from('pages').select('locale').eq('id', id);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => r.locale);
}

export async function savePage(
  db: SupabaseClient,
  id: string,
  input: PageInput,
  sections: Omit<PageSection, 'id'>[]
): Promise<void> {
  /* Upsert rather than update: opening a page in a language it does not exist in
     yet and pressing Save is how the English version gets created. */
  const { error } = await db.from('pages').upsert(
    {
      id,
      locale: input.locale,
      nav_label: input.navLabel,
      sort_order: input.sortOrder,
      hero_label: input.heroLabel,
      hero_title: input.heroTitle,
      hero_intro: input.heroIntro,
      hero_image: input.heroImage,
      hero_variant: input.heroVariant,
      seo: input.seo,
      published: input.published,
      is_template: input.isTemplate
    },
    { onConflict: 'id,locale' }
  );
  if (error) throw error;

  /* Sections are replaced wholesale rather than diffed. They are a short ordered
     list edited as one thing, and a delete-and-reinsert is both simpler and the
     only way to reorder without a second pass. Nothing references a section, so
     regenerating the ids costs nothing. */
  const { error: delErr } = await db
    .from('page_sections')
    .delete()
    .eq('page_id', id)
    .eq('locale', input.locale);
  if (delErr) throw delErr;

  if (sections.length === 0) return;

  const { error: insErr } = await db.from('page_sections').insert(
    sections.map((s, position) => ({
      page_id: id,
      locale: input.locale,
      position,
      type: s.type,
      ground: s.ground,
      anchor: s.anchor || null,
      content: s.content
    }))
  );
  if (insErr) throw insErr;
}

/**
 * The published page a visitor asked for.
 *
 * Falls back to Dutch when the English row does not exist, matching how events
 * and journal already behave: a visitor reading a Dutch paragraph is a smaller
 * failure than a visitor finding nothing at all.
 */
export async function getPublishedPage(
  db: SupabaseClient,
  slug: string,
  locale: 'nl' | 'en' = 'nl'
): Promise<PageRecord | null> {
  const load = async (want: 'nl' | 'en') => {
    const { data, error } = await db
      .from('pages')
      .select('*, page_sections(*)')
      .eq('id', slug)
      .eq('locale', want)
      .eq('published', true)
      .maybeSingle();
    if (error) throw error;
    return data ? toPage(data as Row, ((data as Row).page_sections ?? []) as Row[]) : null;
  };

  return (await load(locale)) ?? (locale === 'nl' ? null : await load('nl'));
}


