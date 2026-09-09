/**
 * Resolving `collection` sections into renderable items.
 *
 * A collection section says "show the foundations here" rather than repeating
 * them, so at render time each one is looked up and flattened into a single
 * shape the renderer can loop over without knowing which type it came from.
 *
 * The consent gates still apply: experts and figures are read as the anonymous
 * visitor, so the RLS policies filter unconfirmed rows out before they ever
 * reach this code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageSection } from './pages';

export interface CollectionItem {
  id: string;
  number?: string;
  title: string;
  subtitle?: string;
  body?: string;
  /** A longer alternative, where a presentation wants more than the one-liner. */
  bodyLong?: string;
  image?: string;
  href?: string;
  /** Alt text where the record carries its own, rather than reusing the title. */
  alt?: string;
  /** Short labels beside an item — the age cards list the formats they feed. */
  tags?: string[];
  /* The event row is the one presentation that needs the record's own shape
     rather than a flattened title/body, because the static markup puts each
     part in its own element: two tags, a date, a place, an age range and a
     status-dependent call to action. */
  meta?: {
    formatName?: string;
    price?: string;
    dateText?: string;
    location?: string;
    ageMin?: number | null;
    ageMax?: number | null;
    status?: string;
    /** Journal card chip. */
    category?: string;
    /** Hosted formats are built with an external partner and link out. */
    isHosted?: boolean;
    /** Figures animate up from zero; main.js reads the target and its suffix. */
    count?: string;
    suffix?: string;
    period?: string;
  };
}

type Row = Record<string, any>;

/* Foundation number -> name, filled before the maps run. A module-level cache
   rather than a parameter on every map, because exactly one source needs it
   and threading it through all ten would be noise. */
const foundationNames = new Map<string, string>();

/** How each content type flattens into the common shape. */
const SOURCES: Record<
  string,
  { table: string; select: string; order: string; asc: boolean; map: (r: Row) => CollectionItem }
> = {
  foundations: {
    table: 'foundations',
    select: 'id,number,name,en_one_liner,nl_body,work_on,image,alt',
    order: 'number',
    asc: true,
    map: (r) => ({
      id: r.id,
      number: r.number,
      title: r.name,
      body: r.en_one_liner,
      bodyLong: r.nl_body,
      image: r.image,
      alt: r.alt,
      tags: Array.isArray(r.work_on) ? r.work_on.map(String) : []
    })
  },
  formats: {
    table: 'formats',
    select: 'id,name,bracket_name,description,meta,image,is_hosted,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: r.bracket_name || r.name,
      subtitle: r.meta,
      body: r.description,
      image: r.image,
      meta: { isHosted: Boolean(r.is_hosted) }
    })
  },
  age_groups: {
    table: 'age_groups',
    select: 'id,label,tagline,body,image,alt,formats,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: r.label,
      subtitle: r.tagline,
      body: r.body,
      image: r.image,
      alt: r.alt,
      tags: Array.isArray(r.formats) ? r.formats.map(String) : []
    })
  },
  tiers: {
    table: 'tiers',
    select: 'id,name,investment_from,benefits,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: r.name,
      subtitle: r.investment_from,
      body: Array.isArray(r.benefits) ? r.benefits.join(' · ') : '',
      tags: Array.isArray(r.benefits) ? r.benefits.map(String) : []
    })
  },
  partners: {
    table: 'partners',
    select: 'id,name,logo,url,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({ id: r.id, title: r.name, image: r.logo, href: r.url })
  },
  figures: {
    table: 'figures',
    select: 'id,value,display,suffix,label,explanation,period,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: `${r.display ?? ''}${r.suffix ?? ''}`,
      subtitle: r.label,
      body: r.explanation ?? '',
      meta: {
        count: r.value != null ? String(r.value) : '',
        suffix: r.suffix ?? '',
        period: r.period ?? ''
      }
    })
  },
  experts: {
    table: 'experts',
    select: 'id,name,org,bio,foundations,portrait',
    order: 'name',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: r.name,
      subtitle: r.org,
      body: r.bio,
      image: r.portrait,
      /* Which foundations this expert carries — stored as numbers, printed as
         "[01] Self-knowledge". The names are looked up once per render and
         passed in, so the card cannot drift from what the foundation is
         actually called. */
      tags: Array.isArray(r.foundations)
        ? r.foundations.map((n: unknown) => {
            const key = String(n);
            const name = foundationNames.get(key);
            return name ? `[${key}] ${name}` : `[${key}]`;
          })
        : []
    })
  },
  events: {
    table: 'events',
    select:
      'id,title,date_text,location,standfirst,hero_image,edition_year,price,status,age_min,age_max,formats(name)',
    order: 'edition_year',
    asc: false,
    map: (r) => ({
      id: r.id,
      title: r.title,
      subtitle: `${r.date_text ?? ''} · ${r.location ?? ''}`,
      body: r.standfirst,
      image: r.hero_image,
      href: `/events/${r.id}`,
      meta: {
        formatName: r.formats?.name ?? '',
        price: r.price ?? '',
        dateText: r.date_text ?? '',
        location: r.location ?? '',
        ageMin: r.age_min ?? null,
        ageMax: r.age_max ?? null,
        status: r.status ?? ''
      }
    })
  },
  journal: {
    table: 'journal',
    select: 'id,title,category,meta,image,alt,published_at',
    order: 'published_at',
    asc: false,
    map: (r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.meta,
      image: r.image,
      alt: r.alt,
      href: `/journal/${r.id}`,
      meta: { category: r.category ?? '' }
    })
  }
};

/**
 * Load every collection section on a page, keyed by the section's position so
 * the renderer can find its own items without a second lookup.
 */
export async function resolveCollections(
  db: SupabaseClient,
  sections: PageSection[]
): Promise<Record<string, CollectionItem[]>> {
  /* Any section that names a source, not only the `collection` type. The team
     block on Over is its own shape — founder cards, two headings, a lead — but
     the expert grid inside it is the same experts table, and it should not need
     a second way of reading it. */
  const wanted = sections
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => String(s.content?.source ?? '').trim() !== '');

  /* The expert cards print the foundations they carry by name, so the lookup
     is loaded once before the sources are read. */
  if (wanted.some(({ s }) => String(s.content?.source ?? '') === 'experts')) {
    const { data } = await db.from('foundations').select('number,name');
    for (const row of (data ?? []) as Row[]) foundationNames.set(String(row.number), row.name);
  }

  const entries = await Promise.all(
    wanted.map(async ({ s }) => {
      const source = String(s.content?.source ?? '');
      const def = SOURCES[source];
      if (!def) return [String(s.position), [] as CollectionItem[]] as const;

      let query = db.from(def.table).select(def.select).order(def.order, { ascending: def.asc });

      /* Figures are one table with two groups — participation on Social
         Impact, reach on Samenwerken — and 03-DATA-MODEL models that as a
         `group` enum. Filtering on it rather than on an ordinal offset means
         reordering the list cannot silently move a figure to the other page. */
      const group = String(s.content?.group ?? '').trim();
      if (group) query = query.eq('group_key', group);

      const limitRaw = String(s.content?.limit ?? '').trim();
      const limit = limitRaw ? Number(limitRaw) : NaN;
      if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);

      const { data, error } = await query;
      // A broken section must not take the whole page down with it.
      if (error) return [String(s.position), [] as CollectionItem[]] as const;

      return [String(s.position), ((data ?? []) as Row[]).map(def.map)] as const;
    })
  );

  return Object.fromEntries(entries);
}
