/**
 * The joined view: signups from Brevo, editions from Ticket Tailor, attribution
 * from our own attributes — read-only, in one screen.
 *
 * 06-CMS-SCOPE.md calls this out as the one place a bespoke backoffice genuinely
 * beats the alternatives. The brief asks for "all signups in one place" and
 * "which campaign drove each signup"; the data exists across three systems and
 * nothing joins it today. This reads. It never writes: Brevo owns the list,
 * Ticket Tailor owns the orders, and neither should have a second author.
 *
 * Everything here fails soft. A missing key or a dead upstream returns a source
 * marked unavailable with the reason attached, because the project's own lesson
 * is that a silent success and a silent failure must never look the same.
 */

import { env } from '$env/dynamic/private';

const TIMEOUT_MS = 8000;

export interface SourceState<T> {
  ok: boolean;
  /** Why it is not usable, in Dutch, for the person looking at the screen. */
  reason?: string;
  /** The raw upstream detail, for whoever has to fix it. */
  detail?: string;
  data: T;
}

async function getJson(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: true; body: unknown } | { ok: false; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status} — ${text.slice(0, 300)}` };
    return { ok: true, body: text ? JSON.parse(text) : null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg === 'The operation was aborted.' ? 'timeout' : msg };
  } finally {
    clearTimeout(timer);
  }
}

export interface Signup {
  email: string;
  name: string;
  form: string;
  event: string;
  locale: string;
  gemeente: string;
  leeftijd: string;
  source: string;
  campaign: string;
  landingPage: string;
  lists: number[];
  createdAt: string;
}

/** The fourteen attributes created on the Brevo account on 8 September 2026. */
function attr(a: Record<string, unknown> | undefined, key: string): string {
  const v = a?.[key];
  return v == null || v === '' ? '' : String(v);
}

export async function loadSignups(): Promise<SourceState<Signup[]>> {
  const key = env.BREVO_API_KEY;
  if (!key) {
    return {
      ok: false,
      reason: 'BREVO_API_KEY staat niet in de omgeving van deze deploy.',
      data: []
    };
  }

  const res = await getJson(
    'https://api.brevo.com/v3/contacts?limit=200&sort=desc',
    { 'api-key': key, accept: 'application/json' }
  );

  if (!res.ok) {
    return {
      ok: false,
      reason: 'Brevo antwoordde niet zoals verwacht.',
      detail: res.detail,
      data: []
    };
  }

  const body = res.body as { contacts?: Record<string, unknown>[] } | null;
  const contacts = body?.contacts ?? [];

  const signups: Signup[] = contacts.map((c) => {
    const a = c.attributes as Record<string, unknown> | undefined;
    return {
      email: String(c.email ?? ''),
      name: attr(a, 'NAAM') || attr(a, 'FIRSTNAME'),
      form: attr(a, 'FORM'),
      event: attr(a, 'EVENT'),
      locale: attr(a, 'LOCALE'),
      gemeente: attr(a, 'GEMEENTE'),
      leeftijd: attr(a, 'LEEFTIJD'),
      source: attr(a, 'UTM_SOURCE') || attr(a, 'REFERRER'),
      campaign: attr(a, 'UTM_CAMPAIGN'),
      landingPage: attr(a, 'LANDING_PAGE'),
      lists: Array.isArray(c.listIds) ? (c.listIds as number[]) : [],
      createdAt: String(c.createdAt ?? '')
    };
  });

  return { ok: true, data: signups };
}

export interface TicketEvent {
  id: string;
  name: string;
  start: string;
  status: string;
  sold: number | null;
  url: string;
}

export async function loadTicketEvents(): Promise<SourceState<TicketEvent[]>> {
  const key = env.TICKET_TAILOR_API_KEY;
  if (!key) {
    return {
      ok: false,
      reason: 'TICKET_TAILOR_API_KEY staat niet in de omgeving van deze deploy.',
      data: []
    };
  }

  // HTTP Basic with the API key as username and an empty password.
  const auth = Buffer.from(`${key}:`).toString('base64');
  const res = await getJson('https://api.tickettailor.com/v1/events?limit=100', {
    Authorization: `Basic ${auth}`,
    accept: 'application/json'
  });

  if (!res.ok) {
    return {
      ok: false,
      reason: 'Ticket Tailor antwoordde niet zoals verwacht.',
      detail: res.detail,
      data: []
    };
  }

  const body = res.body as { data?: Record<string, unknown>[] } | null;
  const events = (body?.data ?? []).map((e) => {
    const start = e.start as Record<string, unknown> | undefined;
    return {
      id: String(e.id ?? ''),
      name: String(e.name ?? ''),
      start: String(start?.iso ?? start?.date ?? ''),
      status: String(e.status ?? ''),
      sold: typeof e.tickets_sold === 'number' ? e.tickets_sold : null,
      url: String(e.url ?? '')
    };
  });

  return { ok: true, data: events };
}

/** Signups grouped by the edition they came in for — the segment a campaign targets. */
export function byEvent(signups: Signup[]): { event: string; total: number; nl: number; en: number }[] {
  const map = new Map<string, { total: number; nl: number; en: number }>();
  for (const s of signups) {
    const key = s.event || '(geen editie)';
    const row = map.get(key) ?? { total: 0, nl: 0, en: 0 };
    row.total += 1;
    if (s.locale === 'en') row.en += 1;
    else row.nl += 1;
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([event, v]) => ({ event, ...v }))
    .sort((a, b) => b.total - a.total);
}

/** Which campaign, source or page actually produced the signups. */
export function bySource(signups: Signup[]): { source: string; total: number }[] {
  const map = new Map<string, number>();
  for (const s of signups) {
    const key = s.campaign || s.source || '(direct)';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);
}
