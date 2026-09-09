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
        const rows = parseJson(form.get(`${base}__rows`), []);
        content[field.name] = Array.isArray(rows)
          ? rows
              .map((r) => {
                const src = (r ?? {}) as Record<string, unknown>;
                const out: Record<string, string> = {};
                for (const col of field.columns) out[col.name] = String(src[col.name] ?? '').trim();
                return out;
              })
              .filter((r) => Object.values(r).some(Boolean))
          : [];
        continue;
      }

      if (field.kind === 'image') {
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

      // Simple fields already travelled inside the JSON payload.
      content[field.name] = String(content[field.name] ?? '');
    }

    sections.push({
      position: sections.length,
      type: draft.type,
      ground: (['white', 'sand', 'black'] as const).includes(draft.ground)
        ? draft.ground
        : 'white',
      anchor: String(draft.anchor ?? '').trim() || null,
      content
    });
  }

  return { sections, errors, orphaned };
}
