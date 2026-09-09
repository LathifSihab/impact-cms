/**
 * Reading a submitted page-configuration form.
 *
 * The sections arrive as one JSON array, but the parts of a section that have
 * their own editors — uploads, tag lists, repeatable rows — post separately,
 * because a file cannot travel inside a JSON string and the tag and row editors
 * already own their own serialisation. This puts them back together.
 *
 * Field names, matching SectionsEditor:
 *
 *   sections                          the array, simple fields already filled in
 *   sections__<i>__<field>            an image's current path
 *   sections__<i>__<field>__file      a newly chosen image
 *   sections__<i>__<field>__clear     that image was removed
 *   sections__<i>__<field>__tags      a tag list
 *   sections__<i>__<field>__rows      a repeatable row list
 */

import { sectionDef, type Ground, type SectionType } from '$lib/sections';
import type { Errors } from '$lib/records';
import type { PageSection } from './pages';
import { UploadError, isManaged, save } from './uploads';

interface Draft {
  type: SectionType;
  ground: Ground;
  anchor: string;
  content: Record<string, unknown>;
}

function asFile(v: FormDataEntryValue | null): File | null {
  return v && typeof v === 'object' && 'size' in v && (v as File).size > 0 ? (v as File) : null;
}

function parseJson(raw: unknown, fallback: unknown): unknown {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export interface PageSectionsResult {
  sections: Omit<PageSection, 'id'>[];
  errors: Errors;
  orphaned: string[];
}

export async function parseSections(
  pageId: string,
  form: FormData
): Promise<PageSectionsResult> {
  const errors: Errors = {};
  const orphaned: string[] = [];

  const raw = parseJson(form.get('sections'), []);
  const drafts = Array.isArray(raw) ? (raw as Draft[]) : [];

  const sections: Omit<PageSection, 'id'>[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i] ?? ({} as Draft);
    const def = sectionDef(draft.type);
    if (!def) {
      errors.sections = 'Onbekend sectietype.';
      continue;
    }

    const content: Record<string, unknown> = { ...(draft.content ?? {}) };

    for (const field of def.fields) {
      const base = `sections__${i}__${field.name}`;

      if (field.kind === 'tags') {
        const list = parseJson(form.get(`${base}__tags`), []);
        content[field.name] = Array.isArray(list) ? list.map(String).filter(Boolean) : [];
        continue;
      }

      if (field.kind === 'rows') {
        const raw = parseJson(form.get(`${base}__rows`), []);
        const rows = Array.isArray(raw) ? raw : [];
        const out: Record<string, string>[] = [];

        for (let r = 0; r < rows.length; r++) {
          const src = (rows[r] ?? {}) as Record<string, unknown>;
          const row: Record<string, string> = {};

          for (const col of field.columns) {
            const current = String(src[col.name] ?? '').trim();

            if (col.kind !== 'image' && col.kind !== 'video') {
              row[col.name] = current;
              continue;
            }

            /* A cell that is an upload posts outside the JSON, under the row
               editor's own name. The reel's clips are the reason: a video
               cannot travel inside a JSON string. */
            const cellBase = `${base}__rows__row__${r}__${col.name}`;
            const file = asFile(form.get(`${cellBase}__file`));
            const cleared = form.get(`${cellBase}__clear`) != null;

            if (file) {
              try {
                const saved = await save('pages', pageId, `${field.name}-${r}-${col.name}`, file);
                row[col.name] = saved.path;
                if (current && current !== saved.path && isManaged(current)) orphaned.push(current);
              } catch (e) {
                errors[`sections.${i}.${field.name}`] =
                  e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
                row[col.name] = current;
              }
            } else if (cleared) {
              row[col.name] = '';
              if (current && isManaged(current)) orphaned.push(current);
            } else {
              row[col.name] = current;
            }
          }

          if (Object.values(row).some(Boolean)) out.push(row);
        }

        content[field.name] = out;
        continue;
      }

      if (field.kind === 'image' || field.kind === 'video') {
        const current = String(form.get(base) ?? '').trim();
        const cleared = form.get(`${base}__clear`) != null;
        const file = asFile(form.get(`${base}__file`));

        if (file) {
          try {
            const saved = await save('pages', pageId, `section-${i}-${field.name}`, file);
            content[field.name] = saved.path;
            if (current && current !== saved.path && isManaged(current)) orphaned.push(current);
          } catch (e) {
            errors[`sections.${i}.${field.name}`] =
              e instanceof UploadError ? e.message : 'Uploaden is niet gelukt.';
            content[field.name] = current;
          }
        } else if (cleared) {
          content[field.name] = '';
          if (current && isManaged(current)) orphaned.push(current);
        } else {
          content[field.name] = current;
        }
        continue;
      }

      if (field.kind === 'consent') {
        // Only the exact affirmative counts; anything else means no.
        content[field.name] = content[field.name] === 'ja' ? 'ja' : '';
        continue;
      }

      // Simple fields already travelled inside the JSON payload.
      content[field.name] = String(content[field.name] ?? '');
    }

    sections.push({
      position: sections.length,
      type: draft.type,
      ground: (['white', 'sand', 'black', 'red'] as const).includes(draft.ground)
        ? draft.ground
        : 'white',
      anchor: String(draft.anchor ?? '').trim() || null,
      content
    });
  }

  return { sections, errors, orphaned };
}
