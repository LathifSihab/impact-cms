/**
 * Page shapes and the helpers that read them — client-safe.
 *
 * These live outside `server/` because components need them. Anything under
 * `$lib/server` is refused by the bundler if it reaches the browser, which is
 * the right rule: that module talks to the database with the caller's
 * credentials. These are the parts with no such dependency — plain types and
 * two lookups over an array.
 */

import type { Ground, SectionType } from './sections';

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
  /** Reassurance items under the headline; the homepage uses these. */
  heroTrust: string[];
  heroCtaLabel: string;
  heroCtaHref: string;
  heroCta2Label: string;
  heroCta2Href: string;
  seo: { title: string; description: string };
  published: boolean;
  /** Shared copy read by another route, not served at its own URL. */
  isTemplate: boolean;
  updatedAt: string;
  sections: PageSection[];
}

export interface PageInput {
  navLabel: string;
  sortOrder: number;
  heroLabel: string;
  heroTitle: string;
  heroIntro: string;
  heroImage: string | null;
  heroVariant: string;
  /** Reassurance items under the headline; the homepage uses these. */
  heroTrust: string[];
  heroCtaLabel: string;
  heroCtaHref: string;
  heroCta2Label: string;
  heroCta2Href: string;
  seo: { title: string; description: string };
  published: boolean;
  isTemplate: boolean;
  locale: 'nl' | 'en';
}

/**
 * A named slot on a page whose layout is fixed.
 *
 * /events and /journal are not free compositions — the list of editions has to
 * sit between the intro and the format strip — so their editable copy is
 * addressed by anchor rather than by position. Reordering sections in the
 * backoffice then cannot move the intro into the middle of the table.
 */
export function sectionAt(page: PageRecord | null, anchor: string): PageSection | null {
  return page?.sections.find((s) => s.anchor === anchor) ?? null;
}

/**
 * Sections that are not one of the fixed slots.
 *
 * Rendered after the fixed layout, so a section someone adds to /events in the
 * backoffice appears somewhere rather than being silently dropped.
 */
export function extraSections(page: PageRecord | null, slots: string[]): PageSection[] {
  return (page?.sections ?? []).filter((s) => !s.anchor || !slots.includes(s.anchor));
}

/**
 * Pages a route depends on by name.
 *
 * `home`, `events` and `journal` are rendered by their own route files, and
 * `event-detail` supplies the chrome for every edition. Deleting one would not
 * remove a page from the site — it would leave a route reading a record that is
 * no longer there. They stay editable; they just cannot be removed from here.
 */
export const SYSTEM_PAGES = ['home', 'events', 'journal', 'event-detail'];

export const isSystemPage = (id: string): boolean => SYSTEM_PAGES.includes(id);
