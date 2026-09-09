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
  | 'reel'
  | 'founders'
  | 'team'
  | 'form'
  | 'cine'
  | 'vcards'
  | 'mosaic'
  | 'legal';

export type Ground = 'white' | 'sand' | 'black' | 'red';

export const GROUNDS: { value: Ground; label: string }[] = [
  { value: 'white', label: 'Wit' },
  { value: 'sand', label: 'Zand' },
  { value: 'black', label: 'Zwart' },
  { value: 'red', label: 'Rood' }
];

/** A field inside a section's `content` payload. */
export type SectionField =
  | { name: string; label: string; kind: 'text' | 'textarea' | 'markdown' | 'image' | 'video' | 'url'; help?: string; placeholder?: string }
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

/* The site sizes a section title to how long it is, and occasionally pushes it
   right. These are the modifiers the stylesheet already defines; offering them
   as a list keeps a section looking like its counterpart on the static site
   without anyone typing a class name. */
const headingStyle: SectionField = {
  name: 'headingStyle',
  label: 'Titelformaat',
  kind: 'select',
  options: [
    { value: '', label: 'Standaard' },
    { value: 'd-l--60', label: 'Groot (60)' },
    { value: 'd-l--48', label: 'Middel (48)' },
    { value: 'd-l--40', label: 'Klein (40)' },
    { value: 'align-right', label: 'Rechts uitgelijnd' }
  ]
};

/* The small link that sits on the right of a section head — "Alle events",
   "Ontdek journal". Rendered as the site's .tlink. */
const headLink: SectionField[] = [
  { name: 'ctaLabel', label: 'Linktekst naast de titel', kind: 'text' },
  { name: 'ctaHref', label: 'Link naast de titel', kind: 'text', placeholder: '/events' }
];

export const SECTIONS: Record<SectionType, SectionDef> = {
  sec_head: {
    type: 'sec_head',
    label: 'Sectiekop',
    blurb: 'Bovenschrift, titel en een inleidende alinea ernaast. De standaardkop op de site.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      lead,
      ...headLink,
      {
        name: 'note',
        label: 'Voetnoot',
        kind: 'textarea',
        help: 'Kleine tekst onder de sectie, zoals de wachtlijst-uitleg op de homepage.'
      }
    ]
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
      /* The press block on Media is a two-column text block with contact rows
         on one side and a boilerplate quote on the other — the same layout
         this type already models, so it carries those rather than a fourth
         two-column type existing beside it. */
      {
        name: 'practical',
        label: 'Gegevensregels',
        kind: 'rows',
        addLabel: 'Regel toevoegen',
        columns: [
          { name: 'label', label: 'Wat' },
          { name: 'value', label: 'Waarde' }
        ]
      },
      { name: 'asideRunning', label: 'Rechts — bovenschrift', kind: 'text' },
      { name: 'quote', label: 'Rechts — citaat', kind: 'textarea' },
      { name: 'cite', label: 'Rechts — bron', kind: 'text' },
      {
        name: 'layout',
        label: 'Beeldverhouding',
        kind: 'select',
        options: [
          { value: 'media', label: 'Beeld op halve breedte' },
          { value: 'plain', label: 'Beeld in eigen kolom' }
        ],
        help: 'De homepage zet het beeld in een eigen kolom; de eventpagina op halve breedte.'
      },
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
      headingStyle,
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
      {
        name: 'note',
        label: 'Voetnoot onder de lijst',
        kind: 'textarea',
        help: 'Kleine tekst onder de items, zoals de wachtlijst-uitleg op de homepage.'
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
          { value: 'logo_grid', label: 'Logoraster' },
          { value: 'marquee', label: 'Lopende logoband' },
          { value: 'tier_table', label: 'Partnershiptabel' },
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
      headingStyle,
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
      headingStyle,
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
      headingStyle,
      lead,
      {
        name: 'style',
        label: 'Stijl',
        kind: 'select',
        options: [
          { value: 'routes', label: 'Routes (klikbaar)' },
          { value: 'layers', label: 'Lagen (niet klikbaar)' },
          { value: 'steps', label: 'Genummerde stappen' },
          { value: 'options', label: 'Mogelijkheden (geen nummers)' },
          { value: 'format_rows', label: 'Formatrijen (eigen tekst)' },
          { value: 'contrib', label: 'Bijdragerijen' }
        ]
      },
      {
        name: 'grid',
        label: 'Kaarten per rij',
        kind: 'select',
        options: [
          { value: 'cards-3', label: 'Drie' },
          { value: 'cards-4', label: 'Vier' }
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
          { name: 'meta', label: 'Rechts' },
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
      headingStyle,
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

  /* The founders block on Over. Two long portraits and a shared closing note —
     bespoke enough that folding it into media_text would mean a media_text with
     six fields nothing else uses. */
  founders: {
    type: 'founders',
    label: 'Founders',
    blurb: 'De twee uitgebreide founderportretten, met citaat, en het gezamenlijke slotblok.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      { name: 'names', label: 'Namen onder de titel', kind: 'text', placeholder: 'Mirte Rens & Jean-Marc Mwema' },
      lead,
      {
        name: 'people',
        label: 'Founders',
        kind: 'rows',
        addLabel: 'Founder toevoegen',
        columns: [
          { name: 'image', label: 'Portret', kind: 'image' },
          { name: 'tag', label: 'Label' },
          { name: 'name', label: 'Naam' },
          { name: 'role', label: 'Rol' },
          { name: 'intro', label: 'Intro', kind: 'textarea' },
          { name: 'body', label: 'Tekst', kind: 'textarea' },
          { name: 'body2', label: 'Tekst (vervolg)', kind: 'textarea' },
          { name: 'quote', label: 'Citaat', kind: 'textarea' },
          { name: 'cite', label: 'Van wie', kind: 'text' }
        ]
      },
      { name: 'duoImage', label: 'Slotblok — beeld', kind: 'image' },
      { name: 'duoRunning', label: 'Slotblok — bovenschrift', kind: 'text' },
      { name: 'duoHeading', label: 'Slotblok — titel', kind: 'text' },
      { name: 'duoBody', label: 'Slotblok — tekst', kind: 'textarea' },
      { name: 'duoBody2', label: 'Slotblok — tekst (vervolg)', kind: 'textarea' },
      { name: 'duoLinkLabel', label: 'Slotblok — linktekst', kind: 'text' },
      { name: 'duoLinkHref', label: 'Slotblok — link', kind: 'text' }
    ]
  },

  /* Team & experts on Over: the founder cards, then the expert grid read from
     the experts table. The grid is a source rather than typed-out rows so the
     confirmed gate keeps applying to it. */
  team: {
    type: 'team',
    label: 'Team & experts',
    blurb: 'Kernteamkaarten plus het expertraster uit Inhoud → Experts.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      lead,
      { name: 'cardsHeading', label: 'Kop boven de kaarten', kind: 'text' },
      {
        name: 'cards',
        label: 'Kernteamkaarten',
        kind: 'rows',
        addLabel: 'Kaart toevoegen',
        columns: [
          { name: 'image', label: 'Portret', kind: 'image' },
          { name: 'tag', label: 'Label' },
          { name: 'name', label: 'Naam' },
          { name: 'role', label: 'Rol' },
          { name: 'body', label: 'Tekst', kind: 'textarea' },
          { name: 'linkLabel', label: 'Linktekst' },
          { name: 'href', label: 'Link' }
        ]
      },
      { name: 'cardsNote', label: 'Notitie onder de kaarten', kind: 'text' },
      { name: 'gridHeading', label: 'Kop boven het raster', kind: 'text' },
      { name: 'gridLead', label: 'Inleiding boven het raster', kind: 'textarea' },
      {
        name: 'source',
        label: 'Raster uit',
        kind: 'select',
        options: [
          { value: '', label: 'Geen raster' },
          { value: 'experts', label: 'Experts' }
        ]
      }
    ]
  },

  /* The contact and request forms. Both pages post the same shape — a
     .wl-card with labelled fields, an error span per field and a privacy line
     — so they are one type with a list of fields rather than two hand-built
     blocks that would drift apart. The `name` is what the receiving function
     keys off, so it is editable but explained. */
  form: {
    type: 'form',
    label: 'Formulier',
    blurb: 'Het contact- of aanvraagformulier, met de velden die het verstuurt.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      { name: 'intro', label: 'Intro naast het formulier', kind: 'textarea' },
      { name: 'meta', label: 'Kleine tekst naast het formulier', kind: 'textarea' },
      {
        name: 'layout',
        label: 'Weergave',
        kind: 'select',
        options: [
          { value: 'plain', label: 'Alleen het formulier' },
          { value: 'two_col', label: 'Tekst naast het formulier' }
        ]
      },
      {
        name: 'formName',
        label: 'Naam van het formulier',
        kind: 'text',
        help: 'Waarop de ontvangende functie filtert — verander dit niet zonder die mee te veranderen.'
      },
      { name: 'formHeading', label: 'Kop in het formulier', kind: 'text' },
      { name: 'formRunning', label: 'Bovenschrift in het formulier', kind: 'text' },
      {
        name: 'inputs',
        label: 'Velden',
        kind: 'rows',
        addLabel: 'Veld toevoegen',
        columns: [
          { name: 'name', label: 'Naam' },
          { name: 'label', label: 'Label' },
          { name: 'type', label: 'Soort', kind: 'text' },
          { name: 'autocomplete', label: 'Autocomplete' },
          { name: 'options', label: 'Keuzes (één per regel)', kind: 'textarea' }
        ]
      },
      { name: 'submitLabel', label: 'Knoptekst', kind: 'text' },
      { name: 'privacy', label: 'Privacyregel', kind: 'textarea' },
      { name: 'privacyLinkLabel', label: 'Privacylink — tekst', kind: 'text' },
      { name: 'privacyLinkHref', label: 'Privacylink — link', kind: 'text' },
      /* Contact puts its direct details and a set of shortcuts beside the
         form, in the same section. They live here rather than in a section of
         their own, because a second section would put a full section's padding
         between a form and the details that belong next to it. */
      { name: 'asideRunning', label: 'Naast het formulier — bovenschrift', kind: 'text' },
      {
        name: 'practical',
        label: 'Naast het formulier — gegevens',
        kind: 'rows',
        addLabel: 'Regel toevoegen',
        columns: [
          { name: 'label', label: 'Wat' },
          { name: 'value', label: 'Waarde' }
        ]
      },
      { name: 'asideHeading', label: 'Naast het formulier — kop', kind: 'text' },
      {
        name: 'shortcuts',
        label: 'Naast het formulier — snelkoppelingen',
        kind: 'rows',
        addLabel: 'Snelkoppeling toevoegen',
        columns: [
          { name: 'title', label: 'Tekst' },
          { name: 'meta', label: 'Rechts' },
          { name: 'href', label: 'Link' }
        ]
      }
    ]
  },

  /* The full-bleed showcase video on Media, with its glass caption and its
     own sound toggle. cinema.js drives it through [data-cine]. */
  cine: {
    type: 'cine',
    label: 'Showcasevideo',
    blurb: 'Eén grote video over de volle breedte, met tekst eroverheen.',
    summary: 'line',
    fields: [
      { name: 'webm', label: 'Video (WebM)', kind: 'video' },
      { name: 'mp4', label: 'Video (MP4)', kind: 'video' },
      { name: 'poster', label: 'Posterbeeld', kind: 'image' },
      { name: 'alt', label: 'Omschrijving (screenreader)', kind: 'text' },
      { name: 'kicker', label: 'Bovenschrift', kind: 'text' },
      { name: 'line', label: 'Regel', kind: 'text' },
      { name: 'note', label: 'Notitie', kind: 'text' }
    ]
  },

  /* The grid of participant clips. Same people as the homepage reel, so the
     same gate: without the tick this renders nothing. */
  vcards: {
    type: 'vcards',
    label: 'Videokaarten',
    blurb: 'Een raster met deelnemersclips. Toont pas iets als de toestemming is aangevinkt.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      lead,
      {
        name: 'clips',
        label: 'Clips',
        kind: 'rows',
        addLabel: 'Clip toevoegen',
        columns: [
          { name: 'webm', label: 'Video (WebM)', kind: 'video' },
          { name: 'mp4', label: 'Video (MP4)', kind: 'video' },
          { name: 'poster', label: 'Posterbeeld', kind: 'image' },
          { name: 'alt', label: 'Omschrijving (screenreader)' },
          { name: 'caption', label: 'Onderschrift' }
        ]
      },
      {
        name: 'consentOnFile',
        label: 'Schriftelijke toestemming van de ouders is op dossier',
        kind: 'consent',
        consequence:
          'Deze clips tonen minderjarige deelnemers. Zonder dit vinkje toont de sectie alleen de tekst en geen enkele clip.'
      }
    ]
  },

  /* The photo archive. lightbox.js finds it through [data-gallery] and opens
     each shot from [data-shot-open]. */
  mosaic: {
    type: 'mosaic',
    label: 'Beeldarchief',
    blurb: "Een raster foto's dat vergroot opent.",
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      lead,
      {
        name: 'shots',
        label: "Foto's",
        kind: 'rows',
        addLabel: 'Foto toevoegen',
        columns: [
          { name: 'image', label: 'Foto', kind: 'image' },
          { name: 'caption', label: 'Onderschrift' },
          { name: 'alt', label: 'Alt-tekst' }
        ]
      },
      { name: 'note', label: 'Notitie onder het raster', kind: 'textarea' }
    ]
  },

  /* The privacy and terms pages: a run of headed blocks down the left and a
     short summary card on the right. The draft notice is a field rather than
     fixed markup, so it can be removed the day the text is signed off without
     touching the template. */
  legal: {
    type: 'legal',
    label: 'Juridische tekst',
    blurb: 'Genummerde tekstblokken met een samenvattingskaart ernaast.',
    summary: 'draftNotice',
    fields: [
      {
        name: 'draftNotice',
        label: 'Waarschuwing bovenaan',
        kind: 'textarea',
        help: 'Laat leeg zodra de tekst juridisch bevestigd is; het kader verdwijnt dan.'
      },
      {
        name: 'blocks',
        label: 'Tekstblokken',
        kind: 'rows',
        addLabel: 'Blok toevoegen',
        columns: [
          { name: 'heading', label: 'Kop' },
          { name: 'body', label: 'Tekst', kind: 'textarea' },
          { name: 'ticks', label: 'Opsomming (één per regel)', kind: 'textarea' }
        ]
      },
      { name: 'updated', label: 'Laatst bijgewerkt', kind: 'text' },
      { name: 'asideRunning', label: 'Kaart — bovenschrift', kind: 'text' },
      { name: 'asideHeading', label: 'Kaart — titel', kind: 'text' },
      { name: 'asideTicks', label: 'Kaart — opsomming (één per regel)', kind: 'textarea' },
      { name: 'asideNote', label: 'Kaart — slotregel', kind: 'textarea' }
    ]
  },

  news_band: {
    type: 'news_band',
    label: 'Nieuwsbriefbalk',
    blurb: 'De inschrijfbalk voor de nieuwsbrief.',
    summary: 'heading',
    fields: [
      running,
      heading,
      headingStyle,
      { name: 'body', label: 'Tekst', kind: 'textarea' },
      {
        name: 'style',
        label: 'Weergave',
        kind: 'select',
        options: [
          { value: 'band', label: 'Smalle balk' },
          { value: 'two_col', label: 'Twee kolommen (homepage)' }
        ],
        help: 'De homepage en Hosted Experiences zetten het formulier naast de tekst.'
      }
    ]
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
  'reel',
  'founders',
  'team',
  'form',
  'cine',
  'vcards',
  'mosaic',
  'legal'
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
