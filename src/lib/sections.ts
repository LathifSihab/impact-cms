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
  | 'news_band'
  | 'downloads'
  | 'split_list'
  | 'numbered_list'
  | 'reel';

export type Ground = 'white' | 'sand' | 'black' | 'red';

export const GROUNDS: { value: Ground; label: string }[] = [
  { value: 'white', label: 'Wit' },
  { value: 'sand', label: 'Zand' },
  { value: 'black', label: 'Zwart' },
  { value: 'red', label: 'Rood' }
];

/** A field inside a section's `content` payload. */
export type SectionField =
  | { name: string; label: string; kind: 'text' | 'textarea' | 'markdown' | 'image' | 'url'; help?: string; placeholder?: string }
  | { name: string; label: string; kind: 'select'; options: { value: string; label: string }[]; help?: string }
  | { name: string; label: string; kind: 'tags'; help?: string }
  | { name: string; label: string; kind: 'consent'; consequence: string; help?: string }
  | {
      name: string;
      label: string;
      kind: 'rows';
      addLabel: string;
      columns: { name: string; label: string; kind?: 'text' | 'textarea' | 'image' | 'video' }[];
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
      {
        name: 'kicker',
        label: 'Kicker',
        kind: 'text',
        placeholder: 'IMPACT for all',
        help: 'Grote regel boven de titel. Alles na een | wordt rood.'
      },
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
      { name: 'ctaHref', label: 'Knoplink', kind: 'text', placeholder: '/events' },
      { name: 'cta2Label', label: 'Tweede knoptekst', kind: 'text' },
      { name: 'cta2Href', label: 'Tweede knoplink', kind: 'text' }
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
        name: 'lead2',
        label: 'Tweede alinea',
        kind: 'textarea',
        help: 'Alleen de horizontale strip gebruikt een tweede alinea.'
      },
      { name: 'ctaLabel', label: 'Linktekst onderaan', kind: 'text' },
      { name: 'ctaHref', label: 'Link onderaan', kind: 'text', placeholder: '/over#fundamenten' },
      {
        name: 'presentation',
        label: 'Weergave',
        kind: 'select',
        options: [
          { value: '', label: 'Standaard voor dit type' },
          { value: 'cards', label: 'Kaarten' },
          { value: 'fund_long', label: 'Fundamenten uitgebreid' },
          { value: 'strip', label: 'Horizontale strip' },
          { value: 'age_cards', label: 'Leeftijdskaarten' },
          { value: 'expert_grid', label: 'Expertraster' },
          { value: 'format_rows', label: 'Formatrijen' },
          { value: 'event_rows', label: 'Eventrijen' },
          { value: 'journal_cards', label: 'Journalkaarten' },
          { value: 'logos', label: 'Logowand' },
          { value: 'stats', label: 'Cijfers' }
        ],
        help: 'Hoe de records eruitzien. Laat op standaard als je twijfelt.'
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

  downloads: {
    type: 'downloads',
    label: 'Downloadlijst',
    blurb: 'Genummerde rij bestanden om te downloaden. Laat de link leeg voor "Volgt".',
    summary: 'heading',
    fields: [
      running,
      heading,
      {
        name: 'items',
        label: 'Bestanden',
        kind: 'rows',
        addLabel: 'Bestand toevoegen',
        columns: [
          { name: 'title', label: 'Naam' },
          { name: 'meta', label: 'Type', kind: 'text' },
          { name: 'href', label: 'Link' }
        ],
        help: 'Een rij zonder link toont als "nog niet beschikbaar".'
      }
    ]
  },

  split_list: {
    type: 'split_list',
    label: 'Twee lijsten naast elkaar',
    blurb: 'Twee kolommen met een titel en een opsomming, om partijen of opties te vergelijken.',
    summary: 'running',
    fields: [
      running,
      { name: 'leftTitle', label: 'Titel links', kind: 'text' },
      { name: 'leftItems', label: 'Punten links', kind: 'tags' },
      { name: 'rightTitle', label: 'Titel rechts', kind: 'text' },
      { name: 'rightItems', label: 'Punten rechts', kind: 'tags' }
    ]
  },

  numbered_list: {
    type: 'numbered_list',
    label: 'Genummerde lijst',
    blurb:
      'Genummerde blokken met titel en tekst — de routekaarten op de homepage, of de lagen op Over.',
    summary: 'running',
    fields: [
      running,
      heading,
      {
        name: 'style',
        label: 'Stijl',
        kind: 'select',
        options: [
          { value: 'routes', label: 'Routes (klikbaar)' },
          { value: 'layers', label: 'Lagen (niet klikbaar)' }
        ]
      },
      {
        name: 'items',
        label: 'Blokken',
        kind: 'rows',
        addLabel: 'Blok toevoegen',
        columns: [
          { name: 'title', label: 'Titel' },
          { name: 'body', label: 'Tekst', kind: 'textarea' },
          { name: 'ctaLabel', label: 'Linktekst' },
          { name: 'ctaHref', label: 'Link' }
        ]
      }
    ]
  },

  reel: {
    type: 'reel',
    label: 'Videoreel',
    blurb:
      'De scrollende clips van deelnemers. De clips tonen pas als de toestemming is aangevinkt.',
    summary: 'heading',
    fields: [
      running,
      heading,
      { name: 'body', label: 'Tekst', kind: 'textarea' },
      { name: 'word', label: 'Achtergrondwoord', kind: 'text', placeholder: 'ECHT' },
      {
        name: 'clips',
        label: 'Clips',
        kind: 'rows',
        addLabel: 'Clip toevoegen',
        columns: [
          { name: 'mp4', label: 'Video (MP4)', kind: 'video' },
          { name: 'webm', label: 'Video (WebM, optioneel)', kind: 'video' },
          { name: 'poster', label: 'Posterbeeld', kind: 'image' },
          /* The caption is three lines on the site, not one: a counter, the
             quote, and who said it. The counter is generated from the clip's
             position, so it can never disagree with the number of clips. */
          { name: 'title', label: 'Uitspraak', kind: 'text' },
          { name: 'meta', label: 'Wie en waar', kind: 'text' },
          {
            name: 'alt',
            label: 'Omschrijving (screenreader)',
            kind: 'text'
          }
        ]
      },
      {
        name: 'note',
        label: 'Notitie onder de reel',
        kind: 'textarea',
        help: 'De kleine tekst onder de clips, over geluid en over de posterbeelden.'
      },
      {
        name: 'consentOnFile',
        label: 'Schriftelijke toestemming van de ouders is op dossier',
        kind: 'consent',
        consequence:
          'Deze clips tonen minderjarige deelnemers. Zonder dit vinkje toont de sectie alleen de tekst en geen enkele clip. Vink het pas aan als de toestemming per clip daadwerkelijk bewaard is — 01-BRIEF.md noteert dat ze op 9 september nog niet geleverd was.'
      }
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
  'news_band',
  'downloads',
  'split_list',
  'numbered_list',
  'reel'
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
    // Consent is never on by default, wherever it appears.
    else if (f.kind === 'consent') out[f.name] = '';
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
  if (type === 'collection') {
    /* A collection often has no heading of its own — the format sections on
       /events do not — and "—" tells the reader nothing about what the row is.
       Name what it pulls in instead. */
    const source = String(content?.source ?? '');
    const label = COLLECTION_SOURCES.find((c) => c.value === source)?.label;
    return label ? `uit ${label}` : '';
  }
  return '';
}
