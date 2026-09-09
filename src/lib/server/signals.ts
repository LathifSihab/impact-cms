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

import type { SupabaseClient } from '@supabase/supabase-js';
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

/* -------------------------------------------------------------- tier 4 ----
 *
 * Traffic and conversion. 08-DASHBOARD's fourth tier, and the last of the
 * brief's analytics asks: "visits, unique visitors, traffic source, signup
 * conversion, and which campaign/page/waitlist drove each signup".
 *
 * It reads two sources, deliberately:
 *
 * Plausible answers how many people came and where from. It is plan-gated —
 * the Stats API is not on every tier — so it fails soft like everything else
 * here and the panel says which key is missing.
 *
 * The attribution half does NOT go to Plausible. Since /api/subscribe was
 * brought in-house, every signup is recorded here with the page, referrer and
 * campaign it arrived through. That is our own data, it needs no key, and it
 * answers "which campaign drove each signup" exactly rather than by inference
 * from a traffic tool. Conversion is then a real ratio: their visitors over our
 * signups, rather than two numbers from two systems that count differently.
 */

export interface Traffic {
  visitors: number;
  pageviews: number;
  /** Where they came from, biggest first. */
  sources: { source: string; visitors: number }[];
  /** Which pages they landed on. */
  pages: { page: string; visitors: number }[];
}

/**
 * Plausible's Stats API v2.
 *
 * One POST per question rather than one big query: a breakdown by source and a
 * breakdown by page are separate dimensions, and asking for both at once
 * returns their cross product, which is not what the panel shows.
 */
export async function loadTraffic(days = 30): Promise<SourceState<Traffic>> {
  const empty: Traffic = { visitors: 0, pageviews: 0, sources: [], pages: [] };
  const key = env.PLAUSIBLE_API_KEY;
  const site = env.PUBLIC_PLAUSIBLE_DOMAIN;

  if (!key || !site) {
    return {
      ok: false,
      reason:
        'Nog niet gekoppeld. Zet PLAUSIBLE_API_KEY en PUBLIC_PLAUSIBLE_DOMAIN om bezoekcijfers te tonen.',
      detail: !key && !site ? 'both missing' : !key ? 'PLAUSIBLE_API_KEY missing' : 'PUBLIC_PLAUSIBLE_DOMAIN missing',
      data: empty
    };
  }

  const query = async (dimensions: string[]) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch('https://plausible.io/api/v2/query', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          site_id: site,
          metrics: ['visitors', 'pageviews'],
          date_range: `${days}d`,
          dimensions
        })
      });
      const text = await res.text();
      if (!res.ok) return { ok: false as const, detail: `HTTP ${res.status} — ${text.slice(0, 300)}` };
      return { ok: true as const, body: JSON.parse(text) as { results?: { metrics: number[]; dimensions: string[] }[] } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, detail: msg === 'The operation was aborted.' ? 'timeout' : msg };
    } finally {
      clearTimeout(timer);
    }
  };

  const totals = await query([]);
  if (!totals.ok) {
    /* 401 means the key is wrong; 402 and some 403s mean the Stats API is not
       on this plan. Saying which saves an hour of checking the wrong thing. */
    const gated = /HTTP 40[23]/.test(totals.detail);
    return {
      ok: false,
      reason: gated
        ? 'Plausible geeft geen toegang tot de Stats API — waarschijnlijk niet inbegrepen in dit abonnement.'
        : 'Plausible antwoordde niet zoals verwacht.',
      detail: totals.detail,
      data: empty
    };
  }

  const first = totals.body.results?.[0]?.metrics ?? [0, 0];
  const [sources, pages] = await Promise.all([
    query(['visit:source']),
    query(['event:page'])
  ]);

  const rows = (r: typeof sources, take: number) =>
    r.ok
      ? (r.body.results ?? [])
          .map((x) => ({ label: x.dimensions[0] || '(direct)', visitors: x.metrics[0] ?? 0 }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, take)
      : [];

  return {
    ok: true,
    data: {
      visitors: first[0] ?? 0,
      pageviews: first[1] ?? 0,
      sources: rows(sources, 8).map((r) => ({ source: r.label, visitors: r.visitors })),
      pages: rows(pages, 8).map((r) => ({ page: r.label, visitors: r.visitors }))
    }
  };
}

export interface Attribution {
  total: number;
  newsletter: number;
  waitlist: number;
  /** Signups whose handover to Brevo failed. These are the ones to replay. */
  undelivered: number;
  campaigns: { label: string; total: number }[];
  landings: { label: string; total: number }[];
  referrers: { label: string; total: number }[];
  recent: {
    at: string;
    form: string;
    event: string;
    locale: string;
    campaign: string;
    delivered: boolean | null;
  }[];
}

/**
 * Attribution, from our own receipts.
 *
 * Every signup has been recorded here since /api/subscribe was brought
 * in-house, with the page, referrer and campaign it came through. No key, no
 * upstream, and no inference: this is the actual row the visitor created.
 *
 * `undelivered` is the operationally useful number. A signup that reached us
 * but not Brevo is not lost — it is sitting here waiting to be replayed — and
 * without a count nobody would know to look.
 */
export async function loadAttribution(
  db: SupabaseClient,
  days = 90
): Promise<SourceState<Attribution>> {
  const empty: Attribution = {
    total: 0,
    newsletter: 0,
    waitlist: 0,
    undelivered: 0,
    campaigns: [],
    landings: [],
    referrers: [],
    recent: []
  };

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await db
    .from('subscriptions')
    .select('form_name, event_slug, locale, landing_page, referrer, campaign, brevo_ok, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      ok: false,
      reason: 'De eigen inschrijvingen konden niet gelezen worden.',
      detail: error.message,
      data: empty
    };
  }

  const rows = (data ?? []) as Record<string, any>[];
  const tally = (pick: (r: Record<string, any>) => string) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = pick(r) || '(direct)';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  /* A referrer is a full URL; the host is what anyone reading this cares about. */
  const host = (url: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return {
    ok: true,
    data: {
      total: rows.length,
      newsletter: rows.filter((r) => r.form_name === 'newsletter').length,
      waitlist: rows.filter((r) => r.form_name === 'waitlist').length,
      undelivered: rows.filter((r) => r.brevo_ok === false).length,
      campaigns: tally((r) => r.campaign?.utm_campaign || r.campaign?.utm_source || ''),
      landings: tally((r) => r.landing_page || r.page || ''),
      referrers: tally((r) => host(r.referrer ?? '')),
      recent: rows.slice(0, 10).map((r) => ({
        at: String(r.created_at),
        form: String(r.form_name),
        event: String(r.event_slug ?? ''),
        locale: String(r.locale ?? ''),
        campaign: String(r.campaign?.utm_campaign || r.campaign?.utm_source || ''),
        delivered: r.brevo_ok ?? null
      }))
    }
  };
}
