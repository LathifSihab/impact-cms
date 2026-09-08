/**
 * The chrome strings for the rendered pages, in both languages.
 *
 * The static site translates differently: `tools/i18n.py` regenerates whole
 * English pages from the Dutch ones using a store of 912 strings keyed by the
 * exact Dutch sentence. That works for a build step over fixed HTML and is
 * miserable for a server-rendered page, because the key is the copy — change a
 * word in Dutch and the English silently falls back to Dutch.
 *
 * These pages are generated from data, so the only translatable text left is
 * the furniture: labels, headings, button text. A small keyed dictionary is the
 * right size for that. Record content carries its own `locale`.
 */

import type { Locale } from './collections';

export const LOCALES: Locale[] = ['nl', 'en'];

const dict = {
  nl: {
    'nav.events': 'Events',
    'nav.journal': 'Journal',
    'nav.backoffice': 'Backoffice',
    'lang.other': 'English',

    'events.title': 'Events',
    'events.lead':
      'Camps, Days en Retreats. Elke editie heeft een eigen pagina, met een wachtlijst waar die er is.',
    'events.empty': 'Er staan op dit moment geen edities gepland.',
    'events.upcoming': 'Komende edities',
    'events.past': 'Voorbije edities',
    'events.view': 'Bekijk editie',

    'status.waitlist': 'Wachtlijst open',
    'status.open': 'Inschrijvingen open',
    'status.full': 'Volzet',
    'status.past': 'Voorbij',

    'event.about': 'Over deze editie',
    'event.programme': 'Programma',
    'event.foundations': 'Fundamenten',
    'event.experts': 'Experts & coaches',
    'event.partners': 'Partners',
    'event.faq': 'Veelgestelde vragen',
    'event.practical': 'Praktisch',
    'event.gallery': 'Beeld',
    'event.format': 'Format',
    'event.age': 'Leeftijd',
    'event.location': 'Locatie',
    'event.price': 'Prijs',
    'event.capacity': 'Plaatsen',
    'event.when': 'Wanneer',
    'event.years': 'jaar',
    'event.back': 'Alle events',

    'wl.title': 'Zet je op de wachtlijst',
    'wl.body':
      'Laat je gegevens achter en je hoort het als eerste wanneer de inschrijvingen opengaan.',
    'wl.name': 'Voornaam van de deelnemer',
    'wl.age': 'Leeftijd',
    'wl.email': 'E-mailadres',
    'wl.town': 'Gemeente',
    'wl.consent':
      'Ik ben ouder of voogd en geef toestemming om deze gegevens te bewaren voor deze wachtlijst.',
    'wl.submit': 'Zet me op de wachtlijst',
    'wl.unavailable':
      'Het wachtlijstformulier is op deze omgeving niet aangesloten. Zet PUBLIC_SUBSCRIBE_ENDPOINT om het te activeren.',
    'open.body': 'De inschrijvingen voor deze editie zijn open.',
    'open.cta': 'Naar de tickets',
    'full.body': 'Deze editie is volzet.',
    'past.body': 'Deze editie is voorbij. Lees de recap in het Journal.',

    'journal.title': 'Journal',
    'journal.lead': 'Recaps, verhalen en inzichten van achter de schermen.',
    'journal.empty': 'Er zijn nog geen artikelen.',
    'journal.read': 'Lees verder',
    'journal.related': 'Bij deze editie',
    'journal.back': 'Alle artikelen',

    'cat.past-event': 'Voorbije editie',
    'cat.story': 'Verhaal',
    'cat.insight': 'Inzicht',
    'cat.social': 'Sociale impact',
    'cat.partner': 'Partner',
    'cat.news': 'Nieuws',

    'foot.built': 'Gebouwd door DRP BuildLab',
    'foot.rendered': 'Deze pagina wordt live uit de backoffice gerenderd.',
    'nf.title': 'Niet gevonden',
    'nf.body': 'Deze pagina bestaat niet of is niet meer beschikbaar.'
  },

  en: {
    'nav.events': 'Events',
    'nav.journal': 'Journal',
    'nav.backoffice': 'Backoffice',
    'lang.other': 'Nederlands',

    'events.title': 'Events',
    'events.lead':
      'Camps, Days and Retreats. Every edition has its own page, with a waiting list where there is one.',
    'events.empty': 'There are no editions scheduled at the moment.',
    'events.upcoming': 'Upcoming editions',
    'events.past': 'Past editions',
    'events.view': 'View edition',

    'status.waitlist': 'Waiting list open',
    'status.open': 'Registration open',
    'status.full': 'Fully booked',
    'status.past': 'Past',

    'event.about': 'About this edition',
    'event.programme': 'Programme',
    'event.foundations': 'Foundations',
    'event.experts': 'Experts & coaches',
    'event.partners': 'Partners',
    'event.faq': 'Frequently asked questions',
    'event.practical': 'Practical',
    'event.gallery': 'Gallery',
    'event.format': 'Format',
    'event.age': 'Age',
    'event.location': 'Location',
    'event.price': 'Price',
    'event.capacity': 'Places',
    'event.when': 'When',
    'event.years': 'years',
    'event.back': 'All events',

    'wl.title': 'Join the waiting list',
    'wl.body': 'Leave your details and you will be the first to hear when registration opens.',
    'wl.name': "Participant's first name",
    'wl.age': 'Age',
    'wl.email': 'Email address',
    'wl.town': 'Town',
    'wl.consent':
      'I am a parent or guardian and consent to these details being kept for this waiting list.',
    'wl.submit': 'Add me to the waiting list',
    'wl.unavailable':
      'The waiting list form is not connected on this environment. Set PUBLIC_SUBSCRIBE_ENDPOINT to enable it.',
    'open.body': 'Registration for this edition is open.',
    'open.cta': 'Go to tickets',
    'full.body': 'This edition is fully booked.',
    'past.body': 'This edition has finished. Read the recap in the Journal.',

    'journal.title': 'Journal',
    'journal.lead': 'Recaps, stories and insights from behind the scenes.',
    'journal.empty': 'There are no articles yet.',
    'journal.read': 'Read more',
    'journal.related': 'From this edition',
    'journal.back': 'All articles',

    'cat.past-event': 'Past edition',
    'cat.story': 'Story',
    'cat.insight': 'Insight',
    'cat.social': 'Social impact',
    'cat.partner': 'Partner',
    'cat.news': 'News',

    'foot.built': 'Built by DRP BuildLab',
    'foot.rendered': 'This page is rendered live from the backoffice.',
    'nf.title': 'Not found',
    'nf.body': 'This page does not exist or is no longer available.'
  }
} as const;

export type StringKey = keyof (typeof dict)['nl'];

/** Translator for one locale. Falls back to the key so a gap is visible. */
export function translator(locale: Locale) {
  const table = dict[locale] ?? dict.nl;
  return (key: StringKey): string => table[key] ?? dict.nl[key] ?? key;
}

/** URL prefix for a locale: Dutch is at the root, English under /en. */
export function prefix(locale: Locale): string {
  return locale === 'en' ? '/en' : '';
}

/** Build a path in a given locale, e.g. path('en', '/events') -> '/en/events'. */
export function path(locale: Locale, rest = ''): string {
  return `${prefix(locale)}${rest}` || '/';
}

export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Turn a stored image value into a URL the browser can fetch.
 *
 * Two shapes live in these columns. Uploaded files are absolute already
 * (`/uploads/...`); legacy values from the static site are relative
 * (`assets/img/...`). Prefixing the first with another slash yields
 * `//uploads/...`, which a browser reads as protocol-relative and sends to a
 * host called "uploads" — so the distinction has to be made, not assumed.
 */
export function imageUrl(stored: string | null | undefined): string {
  const value = (stored ?? '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}
