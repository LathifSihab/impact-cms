/**
 * The content registry.
 *
 * Every list view, every edit form, every validation rule and every database
 * read/write in this CMS is generated from the definitions below. There are ten
 * content types and they differ only in their fields, so describing them once
 * and rendering them generically is a great deal less code than ten hand-written
 * CRUD screens — and it means a new field is one line here, not four files.
 *
 * The field set is taken from reference/content.config.ts. Where a name differs
 * from the Zod schema it is because the column had to be renamed for Postgres
 * (`order` and `group` are reserved words, so: sort_order, group_key).
 */

export type Locale = 'nl' | 'en';

/**
 * Written out rather than derived from the registry object below. `keyof typeof
 * collections` would be tidier, but the registry references CollectionKey in its
 * own `to:` fields, and TypeScript cannot resolve a type that depends on a value
 * that depends on the type.
 */
export type CollectionKey =
  | 'events'
  | 'journal'
  | 'partners'
  | 'experts'
  | 'figures'
  | 'tiers'
  | 'formats'
  | 'foundations'
  | 'age_groups'
  | 'testimonials';

/** Shape of one column inside a `rows` field. */
export interface RowColumn {
  name: string;
  label: string;
  /** 'image' and 'video' turn the cell into an upload; the stored value is a path. */
  kind?: 'text' | 'textarea' | 'image' | 'video';
  placeholder?: string;
}

export type Field =
  /* scalars */
  | Base & { kind: 'text' | 'textarea' | 'markdown' | 'url' | 'image' | 'date' }
  | Base & { kind: 'number'; min?: number; max?: number; integer?: boolean }
  | Base & { kind: 'select'; options: { value: string; label: string }[] }
  | Base & { kind: 'bool' }
  /* the consent gate — a boolean, rendered and worded as the legal act it is */
  | Base & { kind: 'consent'; consequence: string }
  /* relationships */
  | Base & { kind: 'ref'; to: CollectionKey }
  | Base & { kind: 'refs'; to: CollectionKey; join: { table: string; column: string } }
  /* arrays */
  | Base & { kind: 'tags' }
  | Base & { kind: 'choices'; options: { value: string; label: string }[] }
  | Base & { kind: 'rows'; columns: RowColumn[]; addLabel: string }
  | Base & { kind: 'object'; columns: RowColumn[] };

interface Base {
  name: string;
  label: string;
  required?: boolean;
  /**
   * Value to use when the field is left blank. Needed wherever the column is
   * NOT NULL with a database default but the field is optional to fill in: an
   * empty input would otherwise post an explicit null and be rejected.
   */
  default?: string | number | boolean;
  help?: string;
  placeholder?: string;
  /** Group the field appears under in the edit form. */
  group?: string;
  /** Half-width on wide screens. */
  half?: boolean;
}

export interface ListColumn {
  name: string;
  label: string;
  kind?: 'text' | 'status' | 'consent' | 'date' | 'number' | 'ref';
}

export interface Collection {
  key: CollectionKey;
  table: string;
  /** Plural, as it appears in the nav. Dutch — the client's language. */
  label: string;
  /** Singular, for "Nieuw <x>" and page titles. */
  one: string;
  /** One line under the list heading saying what this type is for. */
  blurb: string;
  /** Column used as the human name of a record. */
  title: string;
  /** Default ordering, as a Postgres order expression. */
  order: { column: string; ascending: boolean };
  /** Whether records can be created and deleted, or only edited. */
  fixed?: boolean;
  /** Name of the consent/confirmation boolean, if this type has one. */
  gate?: string;
  list: ListColumn[];
  fields: Field[];
}

export const LOCALES = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'Engels' }
];

const localeField: Field = {
  name: 'locale',
  label: 'Taal',
  kind: 'select',
  options: LOCALES,
  required: true,
  half: true,
  group: 'Publicatie',
  help: 'De site is Nederlands-first; Engels wordt gegenereerd uit i18n-en.json.'
};

export const EVENT_STATUS = [
  { value: 'waitlist', label: 'Wachtlijst open' },
  { value: 'open', label: 'Inschrijvingen open' },
  { value: 'full', label: 'Volzet' },
  { value: 'past', label: 'Voorbij' }
];

export const JOURNAL_CATEGORIES = [
  { value: 'past-event', label: 'Voorbije editie' },
  { value: 'story', label: 'Verhaal' },
  { value: 'insight', label: 'Inzicht' },
  { value: 'social', label: 'Sociale impact' },
  { value: 'partner', label: 'Partner' },
  { value: 'news', label: 'Nieuws' }
];

export const FIGURE_GROUPS = [
  { value: 'forAll', label: 'IMPACT FOR ALL' },
  { value: 'reach', label: 'Bereik' }
];

/** Foundations are referenced by their displayed number on experts. */
export const FOUNDATION_NUMBERS = ['01', '02', '03', '04', '05', '06'].map((n) => ({
  value: n,
  label: n
}));

export const COLLECTIONS: Record<CollectionKey, Collection> = {
  /* ------------------------------------------------------------- events --- */
  events: {
    key: 'events',
    table: 'events',
    label: 'Events',
    one: 'event',
    blurb:
      'Edities van Camps, Days, Retreats en Hosted Experiences. De status stuurt wat de pagina toont — wachtlijstformulier, koopknop, of geen van beide.',
    title: 'title',
    order: { column: 'edition_year', ascending: false },
    list: [
      { name: 'title', label: 'Titel' },
      { name: 'date_text', label: 'Datum' },
      { name: 'location', label: 'Locatie' },
      { name: 'status', label: 'Status', kind: 'status' }
    ],
    fields: [
      { name: 'title', label: 'Titel', kind: 'text', required: true, group: 'Editie' },
      {
        name: 'format_id',
        label: 'Format',
        kind: 'ref',
        to: 'formats',
        required: true,
        half: true,
        group: 'Editie'
      },
      {
        name: 'edition_year',
        label: 'Editiejaar',
        kind: 'number',
        integer: true,
        required: true,
        half: true,
        group: 'Editie'
      },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: EVENT_STATUS,
        required: true,
        half: true,
        group: 'Editie',
        help: 'Stuurt de pagina: wachtlijst toont het formulier, open hoort een kooproute te tonen, volzet en voorbij geen van beide.'
      },
      { ...localeField, group: 'Editie' },

      {
        name: 'date_text',
        label: 'Datum in tekst',
        kind: 'text',
        required: true,
        group: 'Wanneer & waar',
        placeholder: 'Juli 2027 — of: Datum volgt',
        help: 'Wat de bezoeker leest. Staat los van de echte data, zodat een editie zonder bevestigde datum toch iets eerlijks kan zeggen.'
      },
      { name: 'date_start', label: 'Startdatum', kind: 'date', half: true, group: 'Wanneer & waar' },
      { name: 'date_end', label: 'Einddatum', kind: 'date', half: true, group: 'Wanneer & waar' },
      { name: 'location', label: 'Locatie', kind: 'text', required: true, group: 'Wanneer & waar' },

      {
        name: 'age_min',
        label: 'Leeftijd van',
        kind: 'number',
        integer: true,
        min: 0,
        max: 99,
        required: true,
        half: true,
        group: 'Deelname',
        help: 'Wordt met het wachtlijstformulier meegestuurd en server-side hercontroleerd.'
      },
      {
        name: 'age_max',
        label: 'Leeftijd tot',
        kind: 'number',
        integer: true,
        min: 0,
        max: 99,
        required: true,
        half: true,
        group: 'Deelname'
      },
      {
        name: 'price',
        label: 'Prijs',
        kind: 'text',
        half: true,
        group: 'Deelname',
        placeholder: 'Volgt bij bevestiging',
        help: 'Tekst, geen bedrag — de echte waarde is vaak nog geen getal.'
      },
      {
        name: 'capacity',
        label: 'Capaciteit',
        kind: 'number',
        integer: true,
        min: 0,
        half: true,
        group: 'Deelname'
      },

      {
        name: 'standfirst',
        label: 'Standfirst',
        kind: 'textarea',
        required: true,
        group: 'Tekst',
        help: 'Eén alinea, de lead bovenaan de pagina.'
      },
      { name: 'intro', label: 'Intro', kind: 'textarea', required: true, group: 'Tekst' },

      {
        name: 'hero_image',
        label: 'Hero-afbeelding',
        kind: 'image',
        required: true,
        group: 'Beeld'
      },
      { name: 'hero_video', label: 'Hero-video', kind: 'image', group: 'Beeld', placeholder: 'assets/video/...' },
      {
        name: 'gallery',
        label: 'Galerij',
        kind: 'rows',
        addLabel: 'Beeld toevoegen',
        group: 'Beeld',
        columns: [
          { name: 'src', label: 'Afbeelding', kind: 'image' },
          { name: 'alt', label: 'Alt-tekst' }
        ]
      },

      {
        name: 'programme_days',
        label: 'Programma',
        kind: 'rows',
        addLabel: 'Dag toevoegen',
        group: 'Programma',
        columns: [
          { name: 'day', label: 'Dag', placeholder: 'Dag 01' },
          { name: 'title', label: 'Titel' },
          { name: 'body', label: 'Tekst', kind: 'textarea' }
        ]
      },

      {
        name: 'foundations',
        label: 'Fundamenten',
        kind: 'refs',
        to: 'foundations',
        join: { table: 'events_foundations', column: 'foundation_id' },
        group: 'Verbanden'
      },
      {
        name: 'experts',
        label: 'Experts & coaches',
        kind: 'refs',
        to: 'experts',
        join: { table: 'events_experts', column: 'expert_id' },
        group: 'Verbanden',
        help: 'Niet-bevestigde experts staan hier wel, maar publiceren niet.'
      },
      {
        name: 'partners',
        label: 'Partners',
        kind: 'refs',
        to: 'partners',
        join: { table: 'events_partners', column: 'partner_id' },
        group: 'Verbanden'
      },

      {
        name: 'faq',
        label: 'FAQ',
        kind: 'rows',
        addLabel: 'Vraag toevoegen',
        group: 'Praktisch',
        columns: [
          { name: 'q', label: 'Vraag' },
          { name: 'a', label: 'Antwoord', kind: 'textarea' }
        ]
      },
      {
        name: 'practical',
        label: 'Praktische rijen',
        kind: 'rows',
        addLabel: 'Rij toevoegen',
        group: 'Praktisch',
        help: 'De sleutel/waarde-rijen in de zijbalk.',
        columns: [
          { name: 'k', label: 'Label', placeholder: 'Locatie' },
          { name: 'v', label: 'Waarde', placeholder: 'Antwerpen' }
        ]
      },

      {
        name: 'seo',
        label: 'SEO',
        kind: 'object',
        group: 'SEO',
        columns: [
          { name: 'title', label: 'Paginatitel' },
          { name: 'description', label: 'Omschrijving', kind: 'textarea' }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------ journal --- */
  journal: {
    key: 'journal',
    table: 'journal',
    label: 'Journal',
    one: 'artikel',
    blurb: 'De terugkerende content: recaps, verhalen en inzichten. Markdown.',
    title: 'title',
    order: { column: 'published_at', ascending: false },
    list: [
      { name: 'title', label: 'Titel' },
      { name: 'category', label: 'Categorie' },
      { name: 'published_at', label: 'Gepubliceerd', kind: 'date' },
      { name: 'locale', label: 'Taal' }
    ],
    fields: [
      { name: 'title', label: 'Titel', kind: 'text', required: true, group: 'Artikel' },
      {
        name: 'category',
        label: 'Categorie',
        kind: 'select',
        options: JOURNAL_CATEGORIES,
        required: true,
        half: true,
        group: 'Artikel'
      },
      {
        name: 'published_at',
        label: 'Publicatiedatum',
        kind: 'date',
        required: true,
        half: true,
        group: 'Artikel'
      },
      {
        name: 'meta',
        label: 'Meta',
        kind: 'text',
        required: true,
        group: 'Artikel',
        placeholder: 'Recap · aftermovie'
      },
      { ...localeField, group: 'Artikel' },
      {
        name: 'related_event',
        label: 'Gekoppelde editie',
        kind: 'ref',
        to: 'events',
        half: true,
        group: 'Artikel'
      },
      { name: 'image', label: 'Afbeelding', kind: 'image', required: true, group: 'Beeld' },
      { name: 'alt', label: 'Alt-tekst', kind: 'text', required: true, group: 'Beeld' },
      { name: 'body', label: 'Tekst', kind: 'markdown', group: 'Tekst', default: '' }
    ]
  },

  /* ----------------------------------------------------------- partners --- */
  partners: {
    key: 'partners',
    table: 'partners',
    label: 'Partners',
    one: 'partner',
    blurb: 'Logo, link en partnerniveau. Hosts verschijnen op Hosted Experiences.',
    title: 'name',
    order: { column: 'sort_order', ascending: true },
    list: [
      { name: 'name', label: 'Naam' },
      { name: 'tier', label: 'Niveau', kind: 'ref' },
      { name: 'is_host', label: 'Host', kind: 'consent' }
    ],
    fields: [
      { name: 'name', label: 'Naam', kind: 'text', required: true },
      { name: 'url', label: 'Website', kind: 'url', required: true, placeholder: 'https://' },
      { name: 'logo', label: 'Logo', kind: 'image', required: true },
      { name: 'tier', label: 'Partnerniveau', kind: 'ref', to: 'tiers', half: true },
      { name: 'sort_order', label: 'Volgorde', kind: 'number', integer: true, default: 0, half: true },
      { name: 'is_host', label: 'Is host van een Hosted Experience', kind: 'bool' }
    ]
  },

  /* ------------------------------------------------------------ experts --- */
  experts: {
    key: 'experts',
    table: 'experts',
    label: 'Experts',
    one: 'expert',
    blurb:
      'Echte, met naam genoemde mensen. Niets publiceert zolang de bevestiging niet expliciet is aangevinkt.',
    title: 'name',
    order: { column: 'name', ascending: true },
    gate: 'confirmed',
    list: [
      { name: 'name', label: 'Naam' },
      { name: 'org', label: 'Organisatie' },
      { name: 'confirmed', label: 'Bevestigd', kind: 'consent' }
    ],
    fields: [
      { name: 'name', label: 'Naam', kind: 'text', required: true },
      { name: 'org', label: 'Organisatie of vakgebied', kind: 'text', required: true },
      { name: 'bio', label: 'Bio', kind: 'textarea' },
      {
        name: 'foundations',
        label: 'Fundamenten',
        kind: 'choices',
        options: FOUNDATION_NUMBERS,
        help: 'De nummers van de fundamenten waar deze expert aan werkt.'
      },
      { name: 'portrait', label: 'Portret', kind: 'image' },
      {
        name: 'confirmed',
        label: 'Deze persoon mag met naam gepubliceerd worden',
        kind: 'consent',
        consequence:
          'Zolang dit niet is aangevinkt verschijnt deze expert nergens op de site. Vink het pas aan als IMPACT bevestigd heeft dat de naam gebruikt mag worden.'
      }
    ]
  },

  /* ------------------------------------------------------------ figures --- */
  figures: {
    key: 'figures',
    table: 'figures',
    label: 'Cijfers',
    one: 'cijfer',
    blurb: 'Uitspraken over resultaat, altijd met een periode erbij. Een fout vinkje is een publieke foute claim.',
    title: 'label',
    order: { column: 'sort_order', ascending: true },
    gate: 'confirmed',
    list: [
      { name: 'label', label: 'Label' },
      { name: 'display', label: 'Waarde' },
      { name: 'group_key', label: 'Groep' },
      { name: 'confirmed', label: 'Bevestigd', kind: 'consent' }
    ],
    fields: [
      { name: 'label', label: 'Label', kind: 'text', required: true },
      { name: 'value', label: 'Waarde (getal)', kind: 'number', required: true, half: true },
      {
        name: 'display',
        label: 'Waarde (weergave)',
        kind: 'text',
        required: true,
        half: true,
        help: 'Wat er staat. Kan afwijken van het getal, bijvoorbeeld "1.2K".'
      },
      { name: 'suffix', label: 'Achtervoegsel', kind: 'text', half: true, placeholder: '+' },
      {
        name: 'group_key',
        label: 'Groep',
        kind: 'select',
        options: FIGURE_GROUPS,
        required: true,
        half: true
      },
      { name: 'explanation', label: 'Toelichting', kind: 'textarea' },
      {
        name: 'period',
        label: 'Periode',
        kind: 'text',
        required: true,
        placeholder: 'na IMPACT Camp: Basketball Edition 2026'
      },
      { name: 'sort_order', label: 'Volgorde', kind: 'number', integer: true, default: 0, half: true },
      {
        name: 'confirmed',
        label: 'Dit cijfer is geverifieerd en mag gepubliceerd worden',
        kind: 'consent',
        consequence:
          'Zolang dit niet is aangevinkt verschijnt dit cijfer nergens op de site. Het is een publieke claim over resultaat.'
      }
    ]
  },

  /* -------------------------------------------------------------- tiers --- */
  tiers: {
    key: 'tiers',
    table: 'tiers',
    label: 'Partnerniveaus',
    one: 'niveau',
    blurb: 'De investeringsniveaus op Samenwerken, met wat elk niveau oplevert.',
    title: 'name',
    order: { column: 'sort_order', ascending: true },
    list: [
      { name: 'name', label: 'Naam' },
      { name: 'investment_from', label: 'Vanaf' },
      { name: 'sort_order', label: 'Volgorde', kind: 'number' }
    ],
    fields: [
      { name: 'name', label: 'Naam', kind: 'text', required: true, half: true },
      { name: 'investment_from', label: 'Investering vanaf', kind: 'text', required: true, half: true },
      { name: 'sort_order', label: 'Volgorde', kind: 'number', integer: true, default: 0, half: true },
      { name: 'benefits', label: 'Voordelen', kind: 'tags' }
    ]
  },

  /* ------------------------------------------------------------ formats --- */
  formats: {
    key: 'formats',
    table: 'formats',
    label: 'Formats',
    one: 'format',
    blurb: 'Days, Camps, Retreats, Hosted Experiences. Verandert zelden.',
    title: 'name',
    order: { column: 'sort_order', ascending: true },
    list: [
      { name: 'name', label: 'Naam' },
      { name: 'meta', label: 'Meta' },
      { name: 'is_hosted', label: 'Hosted', kind: 'consent' }
    ],
    fields: [
      { name: 'name', label: 'Naam', kind: 'text', required: true, half: true },
      {
        name: 'bracket_name',
        label: 'Naam tussen haakjes',
        kind: 'text',
        required: true,
        half: true,
        placeholder: '[Camps]'
      },
      { name: 'meta', label: 'Meta', kind: 'text', required: true, half: true, placeholder: 'Meerdaags' },
      { name: 'sort_order', label: 'Volgorde', kind: 'number', integer: true, default: 0, half: true },
      { name: 'description', label: 'Korte omschrijving', kind: 'textarea', required: true },
      { name: 'body', label: 'Uitgebreide tekst', kind: 'textarea' },
      { name: 'image', label: 'Afbeelding', kind: 'image' },
      { name: 'ticks', label: 'Kenmerken', kind: 'tags' },
      { name: 'is_hosted', label: 'Is een hosted format', kind: 'bool' }
    ]
  },

  /* -------------------------------------------------------- foundations --- */
  foundations: {
    key: 'foundations',
    table: 'foundations',
    label: 'Fundamenten',
    one: 'fundament',
    blurb: 'De zes pijlers. Vaste set — bewerken kan, toevoegen en verwijderen niet.',
    title: 'name',
    order: { column: 'number', ascending: true },
    fixed: true,
    list: [
      { name: 'number', label: 'Nr' },
      { name: 'name', label: 'Naam' },
      { name: 'en_one_liner', label: 'Engelse oneliner' }
    ],
    fields: [
      { name: 'number', label: 'Nummer', kind: 'text', required: true, half: true, placeholder: '01' },
      { name: 'name', label: 'Naam', kind: 'text', required: true, half: true },
      { name: 'en_one_liner', label: 'Engelse oneliner', kind: 'textarea', required: true },
      { name: 'nl_body', label: 'Nederlandse tekst', kind: 'textarea', required: true },
      { name: 'work_on', label: 'Waar we aan werken', kind: 'tags' },
      { name: 'image', label: 'Afbeelding', kind: 'image', required: true },
      { name: 'alt', label: 'Alt-tekst', kind: 'text', required: true }
    ]
  },

  /* --------------------------------------------------------- age_groups --- */
  age_groups: {
    key: 'age_groups',
    table: 'age_groups',
    label: 'Leeftijdsgroepen',
    one: 'leeftijdsgroep',
    blurb: '8–14, 14–18, 18–25. Vaste set.',
    title: 'label',
    order: { column: 'sort_order', ascending: true },
    fixed: true,
    list: [
      { name: 'label', label: 'Groep' },
      { name: 'tagline', label: 'Tagline' }
    ],
    fields: [
      { name: 'label', label: 'Groep', kind: 'text', required: true, half: true },
      { name: 'tagline', label: 'Tagline', kind: 'text', required: true, half: true },
      { name: 'body', label: 'Tekst', kind: 'textarea', required: true },
      { name: 'formats', label: 'Formats', kind: 'tags', help: 'Weergavenamen, zoals ze op de pagina staan.' },
      { name: 'sort_order', label: 'Volgorde', kind: 'number', integer: true, default: 0, half: true },
      { name: 'image', label: 'Afbeelding', kind: 'image', required: true },
      { name: 'alt', label: 'Alt-tekst', kind: 'text', required: true }
    ]
  },

  /* ------------------------------------------------------- testimonials --- */
  testimonials: {
    key: 'testimonials',
    table: 'testimonials',
    label: 'Testimonials',
    one: 'testimonial',
    blurb:
      'Citaten van ouders en deelnemers. Leeg, en dat is de juiste toestand: er is geen toestemming op dossier.',
    title: 'attribution',
    order: { column: 'updated_at', ascending: false },
    gate: 'consent_on_file',
    list: [
      { name: 'attribution', label: 'Van' },
      { name: 'edition', label: 'Editie' },
      { name: 'consent_on_file', label: 'Toestemming', kind: 'consent' }
    ],
    fields: [
      { name: 'quote', label: 'Citaat', kind: 'textarea', required: true },
      { name: 'attribution', label: 'Toeschrijving', kind: 'text', required: true, half: true, placeholder: 'Ouder van een deelnemer' },
      { name: 'edition', label: 'Editie', kind: 'text', required: true, half: true },
      {
        name: 'consent_on_file',
        label: 'Schriftelijke toestemming is op dossier',
        kind: 'consent',
        consequence:
          'Zonder dit vinkje verschijnt het citaat nergens. Vink het alleen aan als de toestemming van deze persoon daadwerkelijk bewaard is — toestemming die je later niet kunt aantonen telt niet.'
      }
    ]
  }
};

/** Nav order — what the client edits most, first. See 06-CMS-SCOPE.md. */
export const NAV_ORDER: CollectionKey[] = [
  'events',
  'journal',
  'partners',
  'experts',
  'figures',
  'tiers',
  'formats',
  'foundations',
  'age_groups',
  'testimonials'
];

export function getCollection(key: string): Collection | undefined {
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, key)
    ? COLLECTIONS[key as CollectionKey]
    : undefined;
}

/** Fields grouped for the edit form, in declaration order. */
export function fieldGroups(c: Collection): { name: string; fields: Field[] }[] {
  const out: { name: string; fields: Field[] }[] = [];
  for (const f of c.fields) {
    const name = f.group ?? '';
    const last = out[out.length - 1];
    if (last && last.name === name) last.fields.push(f);
    else out.push({ name, fields: [f] });
  }
  return out;
}

export function statusLabel(status: string): string {
  return EVENT_STATUS.find((s) => s.value === status)?.label ?? status;
}
