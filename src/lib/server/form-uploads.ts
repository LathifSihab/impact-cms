/**
 * Turning uploaded files in a submitted form into stored paths.
 *
 * This runs *before* parseRecord and rewrites the form in place: an uploaded
 * file is saved, and the resulting path is written into the field the parser
 * already knows how to read. Doing it in this order means validation sees the
 * final value, so a required image satisfied by an upload does not fail as
 * "verplicht" on the way through.
 *
 * Field conventions, matching the controls in FieldInput and RowsEditor:
 *
 *   <field>              the current stored path, in a hidden input
 *   <field>__file        the new file, if one was chosen
 *   <field>__clear       present when the user removed the image
 *   <field>__file__<i>   a file for row i of a repeatable `rows` field
 */

import type { Collection, Field, RowColumn } from '$lib/collections';
import type { Errors } from '$lib/records';
import { UploadError, isManaged, remove, save } from './uploads';

function imageFields(c: Collection): Field[] {
  return c.fields.filter((f) => f.kind === 'image');
}

function rowsWithImages(c: Collection): Extract<Field, { kind: 'rows' }>[] {
  return c.fields.filter(
    (f): f is Extract<Field, { kind: 'rows' }> =>
      f.kind === 'rows' && f.columns.some((col: RowColumn) => col.kind === 'image')
  );
}

function asFile(v: FormDataEntryValue | null): File | null {
  return v && typeof v === 'object' && 'size' in v && (v as File).size > 0 ? (v as File) : null;
}

export interface UploadOutcome {
  errors: Errors;
  /** Managed files the save has orphaned; delete only once the row is written. */
  orphaned: string[];
}

export async function applyUploads(
  c: Collection,
  recordId: string,
  form: FormData
): Promise<UploadOutcome> {
  const errors: Errors = {};
  const orphaned: string[] = [];

  for (const field of imageFields(c)) {
    const current = String(form.get(field.name) ?? '').trim();
    const cleared = form.get(`${field.name}__clear`) != null;
    const file = asFile(form.get(`${field.name}__file`));

    if (file) {
      try {
        const saved = await save(c.table, recordId, field.name, file);
        form.set(field.name, saved.path);
        // Replacing an image leaves the old one behind unless we say so. Legacy
        // assets/... values are left alone — they belong to the static site.
        if (current && current !== saved.path && isManaged(current)) orphaned.push(current);
      } catch (e) {
        errors[field.name] =
          e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
      }
    } else if (cleared) {
      form.set(field.name, '');
      if (current && isManaged(current)) orphaned.push(current);
    }
  }

  for (const field of rowsWithImages(c)) {
    const imageCols = field.columns.filter((col) => col.kind === 'image');
    let rows: Record<string, string>[];
    try {
      rows = JSON.parse(String(form.get(field.name) ?? '[]'));
      if (!Array.isArray(rows)) rows = [];
    } catch {
      rows = [];
    }

    let touched = false;
    for (let i = 0; i < rows.length; i++) {
      for (const col of imageCols) {
        // ImageInput is mounted as `<field>__row__<i>`, so its file and clear
        // inputs are that name plus the usual suffixes.
        const base = `${field.name}__row__${i}`;
        const file = asFile(form.get(`${base}__file`));
        const cleared = form.get(`${base}__clear`) != null;
        const previous = String(rows[i]?.[col.name] ?? '');

        if (file) {
          try {
            const saved = await save(c.table, recordId, `${field.name}-${i}`, file);
            rows[i] = { ...rows[i], [col.name]: saved.path };
            touched = true;
            if (previous && previous !== saved.path && isManaged(previous)) {
              orphaned.push(previous);
            }
          } catch (e) {
            errors[field.name] =
              e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
          }
        } else if (cleared) {
          rows[i] = { ...rows[i], [col.name]: '' };
          touched = true;
          if (previous && isManaged(previous)) orphaned.push(previous);
        }
      }
    }
    if (touched) form.set(field.name, JSON.stringify(rows));
  }

  return { errors, orphaned };
}

/**
 * Delete orphaned files. Called only after the row is safely written.
 *
 * A failure here must not fail the save — the content is already correct and the
 * worst case is a file nobody references. But it is logged rather than
 * swallowed: silent cleanup failures accumulate invisibly, and "success and
 * silent failure look identical" is the specific mistake this project has
 * already paid for twice.
 */
export async function cleanupOrphans(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (p) => {
      try {
        await remove(p);
      } catch (e) {
        console.error(`[uploads] kon ${p} niet verwijderen:`, e);
      }
    })
  );
}
