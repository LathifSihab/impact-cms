import { COLLECTIONS, NAV_ORDER } from '$lib/collections';
import { listRecords } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.supabase;

  const [events, experts, figures, testimonials] = await Promise.all([
    listRecords(db, COLLECTIONS.events, 'id, title, status, date_text, edition_year, updated_at'),
    listRecords(db, COLLECTIONS.experts, 'id, name, confirmed, updated_at'),
    listRecords(db, COLLECTIONS.figures, 'id, label, display, confirmed, updated_at'),
    listRecords(db, COLLECTIONS.testimonials, 'id, attribution, consent_on_file, updated_at')
  ]);

  /**
   * Everything held back by a consent flag, in one list.
   *
   * This is the thing a generic CMS does not do. `confirmed` and
   * `consentOnFile` decide whether a real person's name appears on a public
   * site, so "what is currently invisible, and why" deserves to be the first
   * screen rather than a boolean buried in a form.
   */
  const blocked = [
    ...experts
      .filter((e) => e.confirmed !== true)
      .map((e) => ({
        collection: 'experts',
        id: String(e.id),
        title: String(e.name),
        reason: 'Wacht op bevestiging dat deze naam gepubliceerd mag worden'
      })),
    ...figures
      .filter((f) => f.confirmed !== true)
      .map((f) => ({
        collection: 'figures',
        id: String(f.id),
        title: `${f.display} — ${f.label}`,
        reason: 'Wacht op verificatie van deze claim'
      })),
    ...testimonials
      .filter((t) => t.consent_on_file !== true)
      .map((t) => ({
        collection: 'testimonials',
        id: String(t.id),
        title: String(t.attribution),
        reason: 'Geen schriftelijke toestemming op dossier'
      }))
  ];

  const byStatus = (s: string) => events.filter((e) => e.status === s).length;

  // Most recently touched records across every type, so "what changed" is answerable.
  const recent = (
    await Promise.all(
      NAV_ORDER.map(async (key) => {
        const c = COLLECTIONS[key];
        const rows = await listRecords(db, c, `id, ${c.title}, updated_at`);
        return rows.map((r) => ({
          collection: key,
          label: c.label,
          id: String(r.id),
          title: String(r[c.title] ?? r.id),
          updated_at: String(r.updated_at ?? '')
        }));
      })
    )
  )
    .flat()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8);

  return {
    tiles: {
      events: events.length,
      waitlist: byStatus('waitlist'),
      open: byStatus('open'),
      blocked: blocked.length
    },
    events: events.slice(0, 6),
    blocked,
    recent
  };
};
