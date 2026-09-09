/**
 * The section types a page can be built from.
 *
 * Same idea as collections.ts: describe each type once, and let the editor and
 * the renderer both read the description. Adding a field to a section is one
 * line here, not a change in two components that then drift apart.
 *
 * The types are not generic containers. Each one corresponds to a shape the
 * static site already has a stylesheet for — .sec-head, .two-col--media,
 * .cta-cards, .band, .news-band — so a page assembled here renders as the site
 * rather than as a page builder's idea of one.
 */

import type { CollectionKey } from './collections';

export type SectionType =
  | 'sec_head'
  | 'rich_text'
  | 'media_text'
  | 'collection'
  | 'cta_cards'
  | 'band'
  | 'news_band';

export type Ground = 'white' | 'sand' | 'black';

export const GROUNDS: { value: Ground; label: string }[] = [
  { value: 'white', label: 'Wit' },
  { value: 'sand', label: 'Zand' },
  { value: 'black', label: 'Zwart' }
];

/** A field inside a section's `content` payload. */
export type SectionField =
  | { name: string; label: string; kind: 'text' | 'textarea' | 'markdown' | 'image' | 'url'; help?: string; placeholder?: string }
  | { name: string; label: string; kind: 'select'; options: { value: string; label: string }[]; help?: string }
  | { name: string; label: string; kind: 'tags'; help?: string }
  | {
      name: string;
      label: string;
      kind: 'rows';
      addLabel: string;
      columns: { name: string; label: string; kind?: 'text' | 'textarea' | 'image' }[];
      help?: string;
    };

export interface SectionDef {
  type: SectionType;
  /** Shown in the "add a section" menu and on the collapsed accordion header. */
  label: string;
  /** One line explaining when to reach for it. */
  blurb: string;
  fields: SectionField[];
  /** Which content field to show on the collapsed header, if any. */
  summary?: string;
}

/** Content types a `collection` section can pull in. */
export const COLLECTION_SOURCES: { value: CollectionKey; label: string }[] = [
  { value: 'foundations', label: 'Fundamenten' },
  { value: 'formats', label: 'Formats' },
  { value: 'age_groups', label: 'Leeftijdsgroepen' },
  { value: 'tiers', label: 'Partnerniveaus' },
  { value: 'partners', label: 'Partners' },
  { value: 'figures', label: 'Cijfers' },
  { value: 'experts', label: 'Experts' },
  { value: 'events', label: 'Events' },
  { value: 'journal', label: 'Journal' }
];

const heading: SectionField = { name: 'heading', label: 'Titel', kind: 'text' };
const running: SectionField = {
  name: 'running',
  label: 'Bovenschrift',
  kind: 'text',
  placeholder: 'Onze formats',
  help: 'Het kleine label boven de titel.'
};
const lead: SectionField = { name: 'lead', label: 'Inleiding', kind: 'textarea' };

export const SECTIONS: Record<SectionType, SectionDef> = {
  sec_head: {
    type: 'sec_head',
    label: 'Sectiekop',
    blurb: 'Bovenschrift, titel en een inleidende alinea ernaast. De standaardkop op de site.',
    summary: 'heading',
    fields: [running, heading, lead]
  },

  rich_text: {
    type: 'rich_text',
    label: 'Tekst',
    blurb: 'Een blok lopende tekst, met optionele kop. Markdown.',
    summary: 'heading',
    fields: [running, heading, { name: 'body', label: 'Tekst', kind: 'markdown' }]
  },

  media_text: {
    type: 'media_text',
    label: 'Tekst met beeld',
    blurb: 'Twee kolommen: tekst met opsomming naast een afbeelding.',
    summary: 'heading',
    fields: [
      running,
      heading,
      { name: 'intro', label: 'Inleiding', kind: 'textarea' },
      { name: 'body', label: 'Tekst', kind: 'textarea' },
      { name: 'ticks', label: 'Opsomming', kind: 'tags', help: 'De aangevinkte punten.' },
      { name: 'image', label: 'Afbeelding', kind: 'image' },
      {
        name: 'imageSide',
        label: 'Beeld aan',
        kind: 'select',
        options: [
          { value: 'right', label: 'Rechts' },
          { value: 'left', label: 'Links' }
        ]
      },
      { name: 'ctaLabel', label: 'Knoptekst', kind: 'text' },
      { name: 'ctaHref', label: 'Knoplink', kind: 'text', placeholder: '/events' }
    ]
  },

  collection: {
    type: 'collection',
    label: 'Inhoud uit een type',
    blurb:
      'Toont records die elders al beheerd worden — fundamenten, partners, cijfers — in plaats van ze hier over te typen.',
    summary: 'heading',
    fields: [
      running,
      heading,
      lead,
      {
        name: 'source',
        label: 'Waarvan',
        kind: 'select',
        options: COLLECTION_SOURCES.map((s) => ({ value: s.value, label: s.label })),
        help: 'Bewerk de records zelf onder Inhoud; hier kies je alleen wat er getoond wordt.'
      },
      {
        name: 'limit',
        label: 'Maximum aantal',
        kind: 'text',
        placeholder: 'leeg = alles',
        help: 'Laat leeg om alles te tonen.'
      }
    ]
  },

  cta_cards: {
    type: 'cta_cards',
    label: 'CTA-kaarten',
    blurb: 'De rij gekleurde kaarten onderaan een pagina.',
    fields: [
      {
        name: 'cards',
        label: 'Kaarten',
        kind: 'rows',
        addLabel: 'Kaart toevoegen',
        columns: [
          { name: 'title', label: 'Titel' },
          { name: 'text', label: 'Tekst', kind: 'textarea' },
          { name: 'ctaLabel', label: 'Knoptekst' },
          { name: 'ctaHref', label: 'Knoplink' },
          { name: 'variant', label: 'Kleur (ink / red / burgundy)' }
        ]
      }
    ]
  },

  band: {
    type: 'band',
    label: 'Balk met knop',
    blurb: 'Donkere balk met één titel en één knop.',
    summary: 'heading',
    fields: [
      running,
      heading,
      { name: 'ctaLabel', label: 'Knoptekst', kind: 'text' },
      { name: 'ctaHref', label: 'Knoplink', kind: 'text' }
    ]
  },

  news_band: {
    type: 'news_band',
    label: 'Nieuwsbriefbalk',
    blurb: 'De inschrijfbalk voor de nieuwsbrief.',
    summary: 'heading',
    fields: [heading, { name: 'body', label: 'Tekst', kind: 'textarea' }]
  }
};

export const SECTION_ORDER: SectionType[] = [
  'sec_head',
  'rich_text',
  'media_text',
  'collection',
  'cta_cards',
  'band',
  'news_band'
];

export function sectionDef(type: string): SectionDef | undefined {
  return SECTIONS[type as SectionType];
}

/** Blank payload for a newly added section, so every input is controlled. */
export function emptySectionContent(type: SectionType): Record<string, unknown> {
  const def = SECTIONS[type];
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (f.kind === 'rows' || f.kind === 'tags') out[f.name] = [];
    else if (f.kind === 'select') out[f.name] = f.options[0]?.value ?? '';
    else out[f.name] = '';
  }
  return out;
}

/** One-line description of a section for the collapsed accordion header. */
export function sectionSummary(type: string, content: Record<string, unknown>): string {
  const def = sectionDef(type);
  if (!def) return '';
  if (def.summary) {
    const v = content?.[def.summary];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  if (type === 'cta_cards') {
    const cards = Array.isArray(content?.cards) ? content.cards : [];
    return `${cards.length} kaart${cards.length === 1 ? '' : 'en'}`;
  }
  return '';
}
