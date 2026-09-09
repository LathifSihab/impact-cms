/**
 * Reading and writing configurable pages.
 *
 * A page is a row plus an ordered list of sections. Both halves are always
 * loaded and saved together, because that is how they are edited: nobody
 * changes one section in isolation, they open a page and press Save.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Ground, SectionType } from '$lib/sections';

export interface PageSection {
  id: string;
  position: number;
  type: SectionType;
  ground: Ground;
  anchor: string | null;
  content: Record<string, unknown>;
}

export interface PageRecord {
  id: string;
  locale: 'nl' | 'en';
  navLabel: string;
  sortOrder: number;
  heroLabel: string;
  heroTitle: string;
  heroIntro: string;
  heroImage: string | null;
  heroVariant: string;
  seo: { title: string; description: string };
  published: boolean;
  updatedAt: string;
  sections: PageSection[];
}

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
}

/**
 * Every page for the list screen. The sections themselves are not loaded — only
 * how many there are, which is what the list shows, and an aggregate is far
 * cheaper than pulling every payload to call .length on it.
 */
export async function listPages(db: SupabaseClient): Promise<PageSummary[]> {
  const { data, error } = await db
    .from('pages')
    .select('*, page_sections(count)')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as Row[]).map((p) => {
    const { sections, ...rest } = toPage(p);
    void sections;
    return { ...rest, sectionCount: p.page_sections?.[0]?.count ?? 0 };
  });
}

export async function getPage(
  db: SupabaseClient,
  id: string,
  locale: 'nl' | 'en' = 'nl'
): Promise<PageRecord | null> {
  const { data, error } = await db
    .from('pages')
    .select('*, page_sections(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Row;
  const page = toPage(row, (row.page_sections ?? []) as Row[]);

  /* One row per language, same as events and journal. An English page with no
     English row falls back to the Dutch one rather than 404ing, because a
     visitor reading Dutch is a smaller failure than a visitor finding nothing.
     The fallback is invisible here — the row simply is what it is — but this is
     where a proper pairing would slot in. */
  void locale;
  return page;
}

export interface PageInput {
  navLabel: string;
  sortOrder: number;
  heroLabel: string;
  heroTitle: string;
  heroIntro: string;
  heroImage: string | null;
  heroVariant: string;
  seo: { title: string; description: string };
  published: boolean;
  locale: 'nl' | 'en';
}

export async function savePage(
  db: SupabaseClient,
  id: string,
  input: PageInput,
  sections: Omit<PageSection, 'id'>[]
): Promise<void> {
  const { error } = await db
    .from('pages')
    .update({
      nav_label: input.navLabel,
      sort_order: input.sortOrder,
      hero_label: input.heroLabel,
      hero_title: input.heroTitle,
      hero_intro: input.heroIntro,
      hero_image: input.heroImage,
      hero_variant: input.heroVariant,
      seo: input.seo,
      published: input.published,
      locale: input.locale
    })
    .eq('id', id);
  if (error) throw error;

  /* Sections are replaced wholesale rather than diffed. They are a short
     ordered list edited as one thing, and a delete-and-reinsert is both simpler
     and the only way to reorder without a second pass. The ids are regenerated,
     which is fine because nothing references a section. */
  const { error: delErr } = await db.from('page_sections').delete().eq('page_id', id);
  if (delErr) throw delErr;

  if (sections.length === 0) return;

  const { error: insErr } = await db.from('page_sections').insert(
    sections.map((s, position) => ({
      page_id: id,
      position,
      type: s.type,
      ground: s.ground,
      anchor: s.anchor || null,
      content: s.content
    }))
  );
  if (insErr) throw insErr;
}

/** The published page a visitor asked for, or null. */
export async function getPublishedPage(
  db: SupabaseClient,
  slug: string
): Promise<PageRecord | null> {
  const { data, error } = await db
    .from('pages')
    .select('*, page_sections(*)')
    .eq('id', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  return toPage(row, (row.page_sections ?? []) as Row[]);
}
