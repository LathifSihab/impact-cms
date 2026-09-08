/**
 * Turning a submitted form into a row, and saying no in Dutch when it is wrong.
 *
 * The site already has an inline-error pattern and a small set of Dutch error
 * strings (see 05-DESIGN-SYSTEM.md). The messages here follow the same voice, so
 * the backoffice reads like the same product rather than a validation library.
 */

import type { Collection, Field } from './collections';

export type Row = Record<string, unknown>;
export type Errors = Record<string, string>;

const REQUIRED = 'Dit veld is verplicht.';

/** Slug rule for record ids — they double as filenames and URL segments. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function asString(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

function parseJson(raw: string, fallback: unknown): unknown {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Read one field out of the form. Returns the value in the shape the column
 * wants, plus an error message when the input cannot be used at all.
 *
 * Parsing and validation are one pass on purpose: "not a number" is a parse
 * outcome and a user-facing error at the same time, and splitting them means
 * deciding twice what an empty string means.
 */
function readField(field: Field, form: FormData): { value: unknown; error?: string } {
  const raw = asString(form.get(field.name));

  switch (field.kind) {
    case 'bool':
      return { value: form.get(field.name) != null };

    case 'consent':
      // Same mechanics as a boolean; the weight is in how it is presented and in
      // the fact that it defaults to false everywhere it appears.
      return { value: form.get(field.name) != null };

    case 'number': {
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { value: null, error: 'Vul een geldig getal in.' };
      if (field.integer && !Number.isInteger(n))
        return { value: null, error: 'Vul een heel getal in.' };
      if (field.min != null && n < field.min)
        return { value: null, error: `Minimaal ${field.min}.` };
      if (field.max != null && n > field.max)
        return { value: null, error: `Maximaal ${field.max}.` };
      return { value: n };
    }

    case 'date': {
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      if (Number.isNaN(Date.parse(raw))) return { value: null, error: 'Vul een geldige datum in.' };
      return { value: raw };
    }

    case 'url': {
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      try {
        const u = new URL(raw);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('scheme');
      } catch {
        return { value: null, error: 'Vul een geldige URL in, inclusief https://.' };
      }
      return { value: raw };
    }

    case 'select': {
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      if (!field.options.some((o) => o.value === raw))
        return { value: null, error: 'Kies een geldige waarde.' };
      return { value: raw };
    }

    case 'ref': {
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      return { value: raw };
    }

    case 'refs':
    case 'tags':
    case 'choices': {
      const arr = parseJson(raw, []);
      if (!Array.isArray(arr)) return { value: [], error: 'Kon deze lijst niet lezen.' };
      const cleaned = arr.map((v) => String(v).trim()).filter(Boolean);
      if (field.required && cleaned.length === 0) return { value: [], error: REQUIRED };
      return { value: cleaned };
    }

    case 'rows': {
      const arr = parseJson(raw, []);
      if (!Array.isArray(arr)) return { value: [], error: 'Kon deze lijst niet lezen.' };
      const cleaned = arr
        .map((entry) => {
          const src = (entry ?? {}) as Record<string, unknown>;
          const out: Record<string, string> = {};
          for (const col of field.columns) out[col.name] = String(src[col.name] ?? '').trim();
          return out;
        })
        // a row where every column is blank is an artefact of clicking "add", not content
        .filter((r) => Object.values(r).some(Boolean));
      return { value: cleaned };
    }

    case 'object': {
      const obj = parseJson(raw, {}) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const col of field.columns) out[col.name] = String(obj?.[col.name] ?? '').trim();
      return { value: out };
    }

    default: {
      // text, textarea, markdown, image
      if (!raw) return field.required ? { value: null, error: REQUIRED } : { value: null };
      return { value: raw };
    }
  }
}

export interface ParseResult {
  /** Column values for the content table. Join fields are not in here. */
  row: Row;
  /** Join-table fields, keyed by field name, as ordered id lists. */
  refs: Record<string, string[]>;
  errors: Errors;
  /** The record id — supplied on create, taken from the URL on edit. */
  id: string;
}

export function parseRecord(c: Collection, form: FormData, existingId?: string): ParseResult {
  const row: Row = {};
  const refs: Record<string, string[]> = {};
  const errors: Errors = {};

  const id = existingId ?? asString(form.get('id')).toLowerCase();
  if (!existingId) {
    if (!id) errors.id = REQUIRED;
    else if (!SLUG.test(id))
      errors.id = 'Gebruik alleen kleine letters, cijfers en koppeltekens.';
  }

  for (const field of c.fields) {
    const { value, error } = readField(field, form);
    if (error) errors[field.name] = error;
    if (field.kind === 'refs') {
      refs[field.name] = (value as string[]) ?? [];
    } else {
      // A blank optional field whose column is NOT NULL with a default posts as
      // null and would be rejected by Postgres; the declared default is what the
      // column means by "left empty".
      row[field.name] = value == null && field.default !== undefined ? field.default : value;
    }
  }

  // Cross-field rules. These are the ones the content actually gets wrong.
  const ageMin = row.age_min as number | null;
  const ageMax = row.age_max as number | null;
  if (typeof ageMin === 'number' && typeof ageMax === 'number' && ageMin > ageMax)
    errors.age_max = 'De bovengrens moet groter zijn dan de ondergrens.';

  const start = row.date_start as string | null;
  const end = row.date_end as string | null;
  if (start && end && Date.parse(end) < Date.parse(start))
    errors.date_end = 'De einddatum ligt voor de startdatum.';

  return { row, refs, errors, id };
}

/** Blank record used by the "new" form, so every input is controlled. */
export function emptyRecord(c: Collection): Row {
  const row: Row = { id: '' };
  for (const f of c.fields) {
    switch (f.kind) {
      case 'bool':
      case 'consent':
        row[f.name] = false;
        break;
      case 'refs':
      case 'tags':
      case 'choices':
      case 'rows':
        row[f.name] = [];
        break;
      case 'object':
        row[f.name] = Object.fromEntries(f.columns.map((col) => [col.name, '']));
        break;
      case 'number':
        row[f.name] = null;
        break;
      case 'select':
        row[f.name] = f.options[0]?.value ?? '';
        break;
      default:
        row[f.name] = '';
    }
  }
  return row;
}

/** Suggest a slug from a title, matching the ids already in reference/content/. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
