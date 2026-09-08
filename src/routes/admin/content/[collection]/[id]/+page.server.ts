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
import { applyUploads, cleanupOrphans } from '$lib/server/form-uploads';
import { removeRecordFolder } from '$lib/server/uploads';
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

    // See the note in the create action: uploads run before validation so the
    // field already holds its stored path by the time it is checked.
    const uploaded = await applyUploads(collection, params.id, form);
    const { row, refs, errors } = parseRecord(collection, form, params.id);
    const allErrors = { ...uploaded.errors, ...errors };

    if (Object.keys(allErrors).length) {
      return fail(400, { errors: allErrors, record: { ...row, ...refs, id: params.id } });
    }

    try {
      await saveRecord(locals.supabase, collection, params.id, row, refs, { create: false });
      // Only once the row is safely written — otherwise a failed save would
      // have deleted the image it still points at.
      await cleanupOrphans(uploaded.orphaned);
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
      // The record is gone, so its folder of images is unreachable. Removing it
      // here is the only chance; nothing else knows those files existed.
      await removeRecordFolder(collection.table, params.id);
    } catch (e) {
      const err = e as ContentError;
      return fail(400, { problem: { message: err.message, detail: err.detail } });
    }

    redirect(303, `/admin/content/${collection.key}`);
  }
};
