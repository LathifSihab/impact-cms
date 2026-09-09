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
  image?: string;
  href?: string;
}

type Row = Record<string, any>;

/** How each content type flattens into the common shape. */
const SOURCES: Record<
  string,
  { table: string; select: string; order: string; asc: boolean; map: (r: Row) => CollectionItem }
> = {
  foundations: {
    table: 'foundations',
    select: 'id,number,name,en_one_liner,nl_body,image',
    order: 'number',
    asc: true,
    map: (r) => ({ id: r.id, number: r.number, title: r.name, body: r.en_one_liner, image: r.image })
  },
  formats: {
    table: 'formats',
    select: 'id,name,bracket_name,description,meta,image,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({ id: r.id, title: r.name, subtitle: r.meta, body: r.description, image: r.image })
  },
  age_groups: {
    table: 'age_groups',
    select: 'id,label,tagline,body,image,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({ id: r.id, title: r.label, subtitle: r.tagline, body: r.body, image: r.image })
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
      body: Array.isArray(r.benefits) ? r.benefits.join(' · ') : ''
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
    select: 'id,display,suffix,label,explanation,period,sort_order',
    order: 'sort_order',
    asc: true,
    map: (r) => ({
      id: r.id,
      title: `${r.display ?? ''}${r.suffix ?? ''}`,
      subtitle: r.label,
      body: r.explanation ?? r.period
    })
  },
  experts: {
    table: 'experts',
    select: 'id,name,org,bio,portrait',
    order: 'name',
    asc: true,
    map: (r) => ({ id: r.id, title: r.name, subtitle: r.org, body: r.bio, image: r.portrait })
  },
  events: {
    table: 'events',
    select: 'id,title,date_text,location,standfirst,hero_image,edition_year',
    order: 'edition_year',
    asc: false,
    map: (r) => ({
      id: r.id,
      title: r.title,
      subtitle: `${r.date_text ?? ''} · ${r.location ?? ''}`,
      body: r.standfirst,
      image: r.hero_image,
      href: `/events/${r.id}`
    })
  },
  journal: {
    table: 'journal',
    select: 'id,title,category,meta,image,published_at',
    order: 'published_at',
    asc: false,
    map: (r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.meta,
      image: r.image,
      href: `/journal/${r.id}`
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
  const wanted = sections
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.type === 'collection');

  const entries = await Promise.all(
    wanted.map(async ({ s }) => {
      const source = String(s.content?.source ?? '');
      const def = SOURCES[source];
      if (!def) return [String(s.position), [] as CollectionItem[]] as const;

      let query = db.from(def.table).select(def.select).order(def.order, { ascending: def.asc });

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
