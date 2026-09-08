import { error, fail, redirect } from '@sveltejs/kit';
import { getCollection } from '$lib/collections';
import { parseRecord } from '$lib/records';
import {
  ContentError,
  deleteRecord,
  getRecord,
  optionsFor,
  saveRecord
} from '$lib/server/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const collection = getCollection(params.collection);
  if (!collection) error(404, 'Dit inhoudstype bestaat niet.');

  const record = await getRecord(locals.supabase, collection, params.id);
  if (!record) error(404, 'Dit record bestaat niet (meer).');

  return {
    collection,
    record,
    options: await optionsFor(locals.supabase, collection),
    created: url.searchParams.has('created')
  };
};

export const actions: Actions = {
  save: async ({ params, request, locals }) => {
    const collection = getCollection(params.collection);
    if (!collection) error(404, 'Dit inhoudstype bestaat niet.');

    const form = await request.formData();
    const { row, refs, errors } = parseRecord(collection, form, params.id);

    if (Object.keys(errors).length) {
      return fail(400, { errors, record: { ...row, ...refs, id: params.id } });
    }

    try {
      await saveRecord(locals.supabase, collection, params.id, row, refs, { create: false });
    } catch (e) {
      const err = e as ContentError;
      return fail(400, {
        record: { ...row, ...refs, id: params.id },
        problem: { message: err.message, detail: err.detail }
      });
    }

    return { saved: true };
  },

  delete: async ({ params, locals }) => {
    const collection = getCollection(params.collection);
    if (!collection) error(404, 'Dit inhoudstype bestaat niet.');
    if (collection.fixed) error(403, 'Dit inhoudstype heeft een vaste set records.');

    try {
      await deleteRecord(locals.supabase, collection, params.id);
    } catch (e) {
      const err = e as ContentError;
      return fail(400, { problem: { message: err.message, detail: err.detail } });
    }

    redirect(303, `/admin/content/${collection.key}`);
  }
};
