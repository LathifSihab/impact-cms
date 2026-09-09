/**
 * Newsletter and waiting-list signups.
 *
 *   POST /api/subscribe
 *
 * A port of the Netlify function in `reference/subscribe.mjs`, which this
 * replaces now that the static build is retired. The contract is unchanged —
 * the same field names, the same status codes, the same JSON — because the
 * forms that post to it are the same forms.
 *
 * One thing had to change. The original leaned on Netlify Forms for an audit
 * copy: "a Brevo outage degrades to 'not segmented yet' rather than 'lost'".
 * There is no Netlify Forms here, so the row is written to Postgres first and
 * handed to Brevo second. Brevo still owns the list and the sending; the table
 * is the receipt, and what to replay from if Brevo was down.
 *
 * Decisions carried over from the original, worth keeping:
 *
 * Validation runs again here even though the browser already did it. The
 * browser check is a courtesy to the visitor; this is the one that counts,
 * because anything can POST to this URL.
 *
 * Brevo accepts a `tags` array and silently discards it — verified against the
 * live account. The segmentation travels as attributes instead, which is also
 * what the backoffice joins on to answer "which campaign drove this signup".
 * The attributes must exist on the Brevo account or they are dropped just as
 * quietly.
 *
 * Without BREVO_API_KEY the endpoint still returns 200. The form keeps working
 * before the account exists, and the row is in Postgres either way.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAMPAIGN = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid'
];

interface Signup {
  formName: string;
  email: string;
  naam: string;
  leeftijd: string;
  gemeente: string;
  consent: string;
  event: string;
  ageMin: number;
  ageMax: number;
  honeypot: string;
  locale: string;
  page: string;
  landingPage: string;
  referrer: string;
  campaign: Record<string, string>;
}

function read(form: URLSearchParams): Signup {
  const get = (k: string) => (form.get(k) ?? '').toString().trim();
  return {
    formName: get('form-name') || 'newsletter',
    email: get('email'),
    naam: get('naam'),
    leeftijd: get('leeftijd'),
    gemeente: get('gemeente'),
    consent: get('consent'),
    event: get('event'),
    ageMin: Number(get('ageMin') || 0),
    ageMax: Number(get('ageMax') || 0),
    honeypot: get('bot-field'),
    locale: get('locale') || 'nl',
    page: get('page'),
    landingPage: get('landing_page'),
    referrer: get('referrer'),
    campaign: Object.fromEntries(
      CAMPAIGN.map((k) => [k, get(k)] as const).filter(([, v]) => v)
    )
  };
}

function validate(d: Signup): Record<string, string> {
  const errors: Record<string, string> = {};
  const nl = d.locale !== 'en';
  if (!EMAIL.test(d.email)) {
    errors.email = nl ? 'Vul een geldig e-mailadres in.' : 'Enter a valid email address.';
  }

  if (d.formName === 'waitlist') {
    if (d.naam.length < 2) {
      errors.naam = nl
        ? 'Vul de voornaam van de deelnemer in.'
        : "Enter the participant's first name.";
    }
    const age = Number(d.leeftijd);
    if (!d.leeftijd || Number.isNaN(age)) {
      errors.leeftijd = nl ? 'Vul een leeftijd in.' : 'Enter an age.';
    } else if (d.ageMin && d.ageMax && (age < d.ageMin || age > d.ageMax)) {
      errors.leeftijd = nl
        ? `Deze editie is voor ${d.ageMin}–${d.ageMax} jaar.`
        : `This edition is for ages ${d.ageMin}–${d.ageMax}.`;
    }
    /* This form collects a child's name and age, so the guardian's consent is a
       server-side requirement and not a checkbox the client can skip. */
    if (!d.consent) {
      errors.consent = nl ? 'Bevestig dit om je in te schrijven.' : 'Confirm this to sign up.';
    }
  }
  return errors;
}

function tagsFor(d: Signup): string[] {
  const tags = [`locale:${d.locale}`];
  if (d.event) tags.push(`event:${d.event}`);
  if (d.formName) tags.push(`form:${d.formName}`);
  if (d.campaign.utm_campaign) tags.push(`campaign:${d.campaign.utm_campaign}`);
  if (d.campaign.utm_source) tags.push(`source:${d.campaign.utm_source}`);
  return tags;
}

/** The receipt. Written before Brevo is called, so nothing is lost to an outage. */
async function record(d: Signup): Promise<string | null> {
  const url = publicEnv.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db
      .from('subscriptions')
      .insert({
        form_name: d.formName === 'waitlist' ? 'waitlist' : 'newsletter',
        email: d.email,
        name: d.naam || null,
        age: d.leeftijd || null,
        gemeente: d.gemeente || null,
        consent: Boolean(d.consent),
        event_slug: d.event || null,
        locale: d.locale,
        page: d.page || null,
        landing_page: d.landingPage || null,
        referrer: d.referrer || null,
        campaign: d.campaign
      })
      .select('id')
      .single();
    if (error) {
      console.error('[subscribe] could not record the signup:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error('[subscribe] could not record the signup:', e);
    return null;
  }
}

interface BrevoResult {
  stored: boolean;
  status?: number;
  reason?: string;
  doubleOptIn?: boolean;
}

async function toBrevo(d: Signup): Promise<BrevoResult> {
  const key = env.BREVO_API_KEY;
  if (!key) return { stored: false, reason: 'BREVO_API_KEY not set' };

  const isWaitlist = d.formName === 'waitlist';
  const listId = isWaitlist ? env.BREVO_LIST_WAITLIST : env.BREVO_LIST_NEWSLETTER;

  const attributes = {
    FIRSTNAME: d.naam || undefined,
    GEMEENTE: d.gemeente || undefined,
    LEEFTIJD: d.leeftijd || undefined,
    LANDING_PAGE: d.landingPage || undefined,
    REFERRER: d.referrer || undefined,
    LOCALE: d.locale || undefined,
    FORM: d.formName || undefined,
    EVENT: d.event || undefined,
    ...Object.fromEntries(Object.entries(d.campaign).map(([k, v]) => [k.toUpperCase(), v]))
  };

  const doi = env.BREVO_DOI_TEMPLATE_ID;
  /* Double opt-in for the newsletter when a template is configured. Not for the
     waiting list: that consent was given explicitly, by an adult, on a form that
     will not submit without the tick — a second confirmation there costs signups
     without adding a record we do not already hold. */
  if (doi && !isWaitlist) {
    const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: d.email,
        attributes,
        includeListIds: listId ? [Number(listId)] : undefined,
        templateId: Number(doi),
        redirectionUrl: env.BREVO_DOI_REDIRECT || undefined
      })
    });
    return { stored: res.ok, status: res.status, doubleOptIn: true };
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: d.email,
      attributes,
      listIds: listId ? [Number(listId)] : undefined,
      updateEnabled: true, // signing up twice is normal, not an error
      tags: tagsFor(d)
    })
  });
  return { stored: res.ok, status: res.status, doubleOptIn: false };
}

export const POST: RequestHandler = async ({ request }) => {
  let form: URLSearchParams;
  try {
    const type = request.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      form = new URLSearchParams(
        Object.entries(body).map(([k, v]) => [k, String(v ?? '')])
      );
    } else if (type.includes('multipart/form-data')) {
      const data = await request.formData();
      form = new URLSearchParams();
      for (const [k, v] of data.entries()) form.append(k, String(v));
    } else {
      form = new URLSearchParams(await request.text());
    }
  } catch {
    return json({ ok: false, error: 'unreadable body' }, { status: 400 });
  }

  const d = read(form);

  /* The honeypot is empty for a human and filled by a bot that completes every
     field. Answer 200 so the bot learns nothing from the difference. */
  if (d.honeypot) return json({ ok: true });

  const errors = validate(d);
  if (Object.keys(errors).length) return json({ ok: false, errors }, { status: 422 });

  // Receipt first, so an upstream failure cannot lose the signup.
  const id = await record(d);

  let result: BrevoResult;
  try {
    result = await toBrevo(d);
  } catch (err) {
    console.error('[subscribe] brevo failed', err);
    result = { stored: false, reason: 'upstream error' };
  }

  /* Record how Brevo answered, so a failed batch can be found and replayed
     rather than guessed at. Best effort: the visitor is already served. */
  if (id) {
    const url = publicEnv.PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      try {
        await createClient(url, key, { auth: { persistSession: false } })
          .from('subscriptions')
          .update({
            brevo_ok: result.stored,
            brevo_status: result.status ?? null,
            brevo_error: result.stored ? null : (result.reason ?? `status ${result.status}`)
          })
          .eq('id', id);
      } catch {
        // The signup is safe; only its delivery note is missing.
      }
    }
  }

  const nl = d.locale !== 'en';
  const message =
    d.formName === 'waitlist'
      ? nl
        ? 'Je staat op de wachtlijst.'
        : 'You are on the waiting list.'
      : result.doubleOptIn
        ? nl
          ? 'Bijna klaar — bevestig je inschrijving via de mail die we net stuurden.'
          : 'Almost there — confirm your signup via the email we just sent.'
        : nl
          ? 'Bedankt — je staat op de lijst.'
          : 'Thanks — you are on the list.';

  return json({ ok: true, message });
};

/** Anything but POST, answered the way the Netlify function answered it. */
export const GET: RequestHandler = () =>
  json({ ok: false, error: 'POST only' }, { status: 405 });
