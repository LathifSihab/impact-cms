import { error, fail, redirect } from '@sveltejs/kit';
import { getCollection } from '$lib/collections';
import { emptyRecord, parseRecord } from '$lib/records';
import { ContentError, optionsFor, saveRecord } from '$lib/server/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const collection = getCollection(params.collection);
  if (!collection) error(404, 'Dit inhoudstype bestaat niet.');
  if (collection.fixed) error(403, 'Dit inhoudstype heeft een vaste set records.');

  return {
    collection,
    record: emptyRecord(collection),
    options: await optionsFor(locals.supabase, collection)
  };
};

export const actions: Actions = {
  save: async ({ params, request, locals }) => {
    const collection = getCollection(params.collection);
    if (!collection) error(404, 'Dit inhoudstype bestaat niet.');
    if (collection.fixed) error(403, 'Dit inhoudstype heeft een vaste set records.');

    const form = await request.formData();
    const { row, refs, errors, id } = parseRecord(collection, form);

    if (Object.keys(errors).length) {
      return fail(400, { errors, record: { ...row, ...refs, id } });
    }

    try {
      await saveRecord(locals.supabase, collection, id, row, refs, { create: true });
    } catch (e) {
      const err = e as ContentError;
      return fail(400, {
        record: { ...row, ...refs, id },
        problem: { message: err.message, detail: err.detail }
      });
    }

    redirect(303, `/content/${collection.key}/${id}?created=1`);
  }
};
