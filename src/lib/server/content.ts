/**
 * Reading and writing content records.
 *
 * Everything here is generic over the registry in $lib/collections: one list,
 * one get, one save, one delete, for all ten types. The only per-type behaviour
 * is the join tables on events, and those are described by the field definition
 * rather than special-cased by name.
 *
 * All queries go through the request-scoped client, so RLS applies as the signed
 * in user. The service-role key is never imported into the app — it exists only
 * for the seed and user scripts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { COLLECTIONS, type Collection, type CollectionKey, type Field } from '$lib/collections';
import type { Row } from '$lib/records';

export class ContentError extends Error {
  constructor(
    message: string,
    readonly detail?: string
  ) {
    super(message);
  }
}

function refFields(c: Collection): Extract<Field, { kind: 'refs' }>[] {
  return c.fields.filter((f): f is Extract<Field, { kind: 'refs' }> => f.kind === 'refs');
}

/**
 * Translate a Postgres error into something a founder can act on. Supabase
 * returns useful codes; the raw messages are English and mention column names.
 */
function readable(error: { code?: string; message: string; details?: string }): ContentError {
  switch (error.code) {
    case '23505':
      return new ContentError('Er bestaat al een record met dit id.', error.details);
    case '23503':
      return new ContentError(
        'Dit record hangt nog aan een ander record vast en kan zo niet bewaard of verwijderd worden.',
        error.details
      );
    case '23514':
      return new ContentError('Een waarde valt buiten wat dit veld toelaat.', error.details);
    case '42501':
      return new ContentError('Je account heeft geen rechten op deze tabel.', error.details);
    default:
      return new ContentError('Opslaan is niet gelukt.', `${error.code ?? ''} ${error.message}`.trim());
  }
}

export async function listRecords(
  db: SupabaseClient,
  c: Collection,
  columns = '*'
): Promise<Row[]> {
  const { data, error } = await db
    .from(c.table)
    .select(columns)
    .order(c.order.column, { ascending: c.order.ascending })
    .order('id', { ascending: true });
  if (error) throw readable(error);
  return (data ?? []) as unknown as Row[];
}

export async function countRecords(db: SupabaseClient, c: Collection): Promise<number> {
  const { count, error } = await db.from(c.table).select('id', { count: 'exact', head: true });
  if (error) throw readable(error);
  return count ?? 0;
}

/** One record, with its join-table fields flattened into ordered id arrays. */
export async function getRecord(
  db: SupabaseClient,
  c: Collection,
  id: string
): Promise<Row | null> {
  const { data, error } = await db.from(c.table).select('*').eq('id', id).maybeSingle();
  if (error) throw readable(error);
  if (!data) return null;

  const row = data as Row;
  for (const f of refFields(c)) {
    // Typed as a plain string: supabase-js parses literal select strings into
    // result types, and a template literal defeats that parser rather than
    // helping it.
    const select: string = `${f.join.column}, position`;
    const { data: links, error: linkError } = await db
      .from(f.join.table)
      .select(select)
      .eq('event_id', id)
      .order('position', { ascending: true });
    if (linkError) throw readable(linkError);
    row[f.name] = (links ?? []).map(
      (l) => (l as unknown as Record<string, unknown>)[f.join.column] as string
    );
  }
  return row;
}

/**
 * Options for a `ref` / `refs` picker: id, label, and a second line so the user
 * can tell two similar records apart. Also carries the consent gate, because
 * picking an unconfirmed expert is allowed but worth showing.
 */
export interface RefOption {
  id: string;
  label: string;
  sub?: string;
  blocked?: boolean;
}

export async function refOptions(
  db: SupabaseClient,
  key: CollectionKey
): Promise<RefOption[]> {
  const target = COLLECTIONS[key];
  const cols = ['id', target.title, target.gate].filter(Boolean).join(',');
  const { data, error } = await db
    .from(target.table)
    .select(cols)
    .order(target.order.column, { ascending: target.order.ascending });
  if (error) throw readable(error);

  return (data ?? []).map((r) => {
    const rec = r as unknown as Row;
    return {
      id: String(rec.id),
      label: String(rec[target.title] ?? rec.id),
      sub: String(rec.id),
      blocked: target.gate ? rec[target.gate] !== true : false
    };
  });
}

/** Every ref/refs target a collection's form needs, loaded in one pass. */
export async function optionsFor(
  db: SupabaseClient,
  c: Collection
): Promise<Record<string, RefOption[]>> {
  const targets = new Set<CollectionKey>();
  for (const f of c.fields) {
    if (f.kind === 'ref' || f.kind === 'refs') targets.add(f.to);
  }
  const entries = await Promise.all(
    [...targets].map(async (key) => [key, await refOptions(db, key)] as const)
  );
  return Object.fromEntries(entries);
}

/**
 * Insert or update, then reconcile the join tables.
 *
 * The links are replaced wholesale rather than diffed: the arrays are three or
 * four ids long and ordered, so a delete-and-reinsert is both simpler and the
 * only way to change the order without a second update pass.
 */
export async function saveRecord(
  db: SupabaseClient,
  c: Collection,
  id: string,
  row: Row,
  refs: Record<string, string[]>,
  { create }: { create: boolean }
): Promise<void> {
  const payload = { ...row, id };

  if (create) {
    const { error } = await db.from(c.table).insert(payload);
    if (error) throw readable(error);
  } else {
    const { error } = await db.from(c.table).update(row).eq('id', id);
    if (error) throw readable(error);
  }

  for (const f of refFields(c)) {
    const ids = refs[f.name] ?? [];
    const { error: delError } = await db.from(f.join.table).delete().eq('event_id', id);
    if (delError) throw readable(delError);
    if (ids.length === 0) continue;

    const links = ids.map((refId, position) => ({
      event_id: id,
      [f.join.column]: refId,
      position
    }));
    const { error: insError } = await db.from(f.join.table).insert(links);
    if (insError) throw readable(insError);
  }
}

export async function deleteRecord(
  db: SupabaseClient,
  c: Collection,
  id: string
): Promise<void> {
  const { error } = await db.from(c.table).delete().eq('id', id);
  if (error) throw readable(error);
}
