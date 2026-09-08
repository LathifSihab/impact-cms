/**
 * Reads for the public site.
 *
 * Separate from server/content.ts because the two have genuinely different
 * jobs. The backoffice reads one record by id, as staff, to edit it. The site
 * reads sets of records, as an anonymous visitor, to render them — which means
 * resolving relationships into the shapes a page actually needs, and never
 * seeing a row whose consent flag is false.
 *
 * That last part is not enforced here. It is enforced by the anon RLS policies
 * in 20260909120000_public_read.sql, so a query written wrongly still cannot
 * leak an unconfirmed person. This module is free to just ask for what it wants.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '$lib/collections';

export interface GalleryItem {
  src: string;
  alt: string;
}
export interface ProgrammeDay {
  day: string;
  title: string;
  body: string;
}
export interface FaqItem {
  q: string;
  a: string;
}
export interface PracticalRow {
  k: string;
  v: string;
}

export interface EventSummary {
  id: string;
  title: string;
  dateText: string;
  location: string;
  ageMin: number;
  ageMax: number;
  status: 'waitlist' | 'open' | 'full' | 'past';
  editionYear: number;
  standfirst: string;
  heroImage: string;
  formatName: string | null;
  price: string | null;
}

export interface EventDetail extends EventSummary {
  intro: string;
  heroVideo: string | null;
  capacity: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  gallery: GalleryItem[];
  programmeDays: ProgrammeDay[];
  faq: FaqItem[];
  practical: PracticalRow[];
  seo: { title: string; description: string };
  foundations: { id: string; number: string; name: string; enOneLiner: string }[];
  /** Only the confirmed ones ever arrive here — the policy sees to it. */
  experts: { id: string; name: string; org: string; bio: string | null }[];
  partners: { id: string; name: string; logo: string; url: string }[];
}

export interface JournalSummary {
  id: string;
  title: string;
  category: string;
  meta: string;
  image: string;
  alt: string;
  publishedAt: string;
}

export interface JournalPost extends JournalSummary {
  body: string;
  relatedEvent: { id: string; title: string } | null;
}

type Row = Record<string, any>;

/**
 * Pick one record per id, preferring the requested locale.
 *
 * The content model is one row per language rather than paired translations —
 * 05-DESIGN-SYSTEM.md flags this as the thing worth fixing, and it has not been
 * fixed. Until it is, an English page with no English row shows the Dutch one
 * rather than an empty list, because a visitor reading a Dutch paragraph is a
 * smaller failure than a visitor finding nothing at all.
 */
function preferLocale<T extends Row>(rows: T[], locale: Locale): T[] {
  if (locale === 'nl') return rows.filter((r) => (r.locale ?? 'nl') === 'nl');
  const byId = new Map<string, T>();
  for (const r of rows) {
    const existing = byId.get(r.id);
    if (!existing || (r.locale === locale && existing.locale !== locale)) byId.set(r.id, r);
  }
  return [...byId.values()];
}

const ORDER: Record<string, number> = { waitlist: 0, open: 0, full: 1, past: 2 };

export async function listEvents(
  db: SupabaseClient,
  locale: Locale
): Promise<EventSummary[]> {
  const { data, error } = await db
    .from('events')
    .select(
      'id,title,date_text,location,age_min,age_max,status,edition_year,standfirst,hero_image,price,locale,formats(name)'
    )
    .order('edition_year', { ascending: false });
  if (error) throw error;

  return preferLocale((data ?? []) as Row[], locale)
    .map((e) => ({
      id: e.id,
      title: e.title,
      dateText: e.date_text,
      location: e.location,
      ageMin: e.age_min,
      ageMax: e.age_max,
      status: e.status,
      editionYear: e.edition_year,
      standfirst: e.standfirst,
      heroImage: e.hero_image,
      price: e.price,
      formatName: e.formats?.name ?? null
    }))
    // upcoming first, then full, then past; newest edition first within each
    .sort(
      (a, b) =>
        (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || b.editionYear - a.editionYear
    );
}

export async function getEvent(
  db: SupabaseClient,
  slug: string
): Promise<EventDetail | null> {
  const { data, error } = await db
    .from('events')
    .select(
      `id,title,date_text,date_start,date_end,location,age_min,age_max,status,edition_year,
       standfirst,intro,hero_image,hero_video,price,capacity,gallery,programme_days,faq,
       practical,seo,locale,
       formats(name),
       events_foundations(position, foundations(id,number,name,en_one_liner)),
       events_experts(position, experts(id,name,org,bio)),
       events_partners(position, partners(id,name,logo,url))`
    )
    .eq('id', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const e = data as Row;
  const ordered = <T>(rows: Row[] | null, key: string): T[] =>
    (rows ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((r) => r[key])
      .filter(Boolean) as T[];

  return {
    id: e.id,
    title: e.title,
    dateText: e.date_text,
    dateStart: e.date_start,
    dateEnd: e.date_end,
    location: e.location,
    ageMin: e.age_min,
    ageMax: e.age_max,
    status: e.status,
    editionYear: e.edition_year,
    standfirst: e.standfirst,
    intro: e.intro,
    heroImage: e.hero_image,
    heroVideo: e.hero_video,
    price: e.price,
    capacity: e.capacity,
    formatName: e.formats?.name ?? null,
    gallery: (e.gallery ?? []) as GalleryItem[],
    programmeDays: (e.programme_days ?? []) as ProgrammeDay[],
    faq: (e.faq ?? []) as FaqItem[],
    practical: (e.practical ?? []) as PracticalRow[],
    seo: e.seo ?? { title: e.title, description: e.standfirst },
    foundations: ordered<Row>(e.events_foundations, 'foundations').map((f) => ({
      id: f.id,
      number: f.number,
      name: f.name,
      enOneLiner: f.en_one_liner
    })),
    experts: ordered<Row>(e.events_experts, 'experts').map((x) => ({
      id: x.id,
      name: x.name,
      org: x.org,
      bio: x.bio
    })),
    partners: ordered<Row>(e.events_partners, 'partners').map((p) => ({
      id: p.id,
      name: p.name,
      logo: p.logo,
      url: p.url
    }))
  };
}

export async function listJournal(
  db: SupabaseClient,
  locale: Locale
): Promise<JournalSummary[]> {
  const { data, error } = await db
    .from('journal')
    .select('id,title,category,meta,image,alt,published_at,locale')
    .order('published_at', { ascending: false });
  if (error) throw error;

  return preferLocale((data ?? []) as Row[], locale).map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category,
    meta: j.meta,
    image: j.image,
    alt: j.alt,
    publishedAt: j.published_at
  }));
}

export async function getJournalPost(
  db: SupabaseClient,
  slug: string
): Promise<JournalPost | null> {
  const { data, error } = await db
    .from('journal')
    .select('id,title,category,meta,image,alt,published_at,body,locale,events(id,title)')
    .eq('id', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const j = data as Row;
  return {
    id: j.id,
    title: j.title,
    category: j.category,
    meta: j.meta,
    image: j.image,
    alt: j.alt,
    publishedAt: j.published_at,
    body: j.body ?? '',
    relatedEvent: j.events ? { id: j.events.id, title: j.events.title } : null
  };
}

/** Slugs for the sitemap. */
export async function allSlugs(
  db: SupabaseClient
): Promise<{ events: string[]; journal: string[] }> {
  const [e, j] = await Promise.all([
    db.from('events').select('id'),
    db.from('journal').select('id')
  ]);
  return {
    events: (e.data ?? []).map((r) => String((r as Row).id)),
    journal: (j.data ?? []).map((r) => String((r as Row).id))
  };
}
