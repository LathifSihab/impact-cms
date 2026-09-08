import { error } from '@sveltejs/kit';
import { getCollection } from '$lib/collections';
import { listRecords } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const collection = getCollection(params.collection);
  if (!collection) error(404, 'Dit inhoudstype bestaat niet.');

  const columns = new Set(['id', 'updated_at', collection.title]);
  for (const col of collection.list) columns.add(col.name);
  if (collection.gate) columns.add(collection.gate);

  const records = await listRecords(locals.supabase, collection, [...columns].join(','));

  return { collection, records };
};
