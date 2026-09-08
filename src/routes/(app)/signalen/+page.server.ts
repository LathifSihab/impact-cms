import { COLLECTIONS } from '$lib/collections';
import { listRecords } from '$lib/server/content';
import { byEvent, bySource, loadSignups, loadTicketEvents } from '$lib/server/signals';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [signups, ticketEvents, events] = await Promise.all([
    loadSignups(),
    loadTicketEvents(),
    listRecords(locals.supabase, COLLECTIONS.events, 'id, title, status, date_text')
  ]);

  /**
   * The join itself: our own editions, the signups Brevo holds for each, and the
   * Ticket Tailor event that sells them. The key is the event slug, which the
   * signup form sends as the EVENT attribute — that is the only thing the three
   * systems agree on, and it is why the attribute exists.
   */
  const perEvent = byEvent(signups.data);
  const rows = events.map((e) => {
    const slug = String(e.id);
    const waiting = perEvent.find((p) => p.event === slug);
    const tt = ticketEvents.data.find(
      (t) => t.name.toLowerCase().trim() === String(e.title).toLowerCase().trim()
    );
    return {
      id: slug,
      title: String(e.title),
      status: String(e.status),
      dateText: String(e.date_text ?? ''),
      signups: waiting?.total ?? 0,
      nl: waiting?.nl ?? 0,
      en: waiting?.en ?? 0,
      ticketTailor: tt ? { name: tt.name, sold: tt.sold, status: tt.status } : null
    };
  });

  /* Signups whose EVENT does not match any edition we know about. Worth showing:
     it means a form is sending a slug that has been renamed, and those contacts
     will be missed by the segment when registration opens. */
  const orphans = perEvent.filter(
    (p) => p.event !== '(geen editie)' && !events.some((e) => String(e.id) === p.event)
  );

  return {
    rows,
    orphans,
    sources: bySource(signups.data).slice(0, 12),
    totals: {
      signups: signups.data.length,
      newsletter: signups.data.filter((s) => s.form === 'newsletter').length,
      waitlist: signups.data.filter((s) => s.form === 'waitlist').length
    },
    brevo: { ok: signups.ok, reason: signups.reason, detail: signups.detail },
    tickets: { ok: ticketEvents.ok, reason: ticketEvents.reason, detail: ticketEvents.detail }
  };
};
