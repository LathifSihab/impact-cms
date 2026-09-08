import { error, fail, redirect } from '@sveltejs/kit';
import { getCollection } from '$lib/collections';
import { emptyRecord, parseRecord } from '$lib/records';
import { ContentError, optionsFor, saveRecord } from '$lib/server/content';
import { applyUploads, cleanupOrphans } from '$lib/server/form-uploads';
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

    /* Uploads first: saving a file rewrites the field to its stored path, so
       validation sees the final value and a required image satisfied by an
       upload is not rejected as missing. */
    const slug = String(form.get('id') ?? '').trim().toLowerCase();
    const uploaded = slug ? await applyUploads(collection, slug, form) : { errors: {}, orphaned: [] };

    const { row, refs, errors, id } = parseRecord(collection, form);
    const allErrors = { ...uploaded.errors, ...errors };

    if (Object.keys(allErrors).length) {
      return fail(400, { errors: allErrors, record: { ...row, ...refs, id } });
    }

    try {
      await saveRecord(locals.supabase, collection, id, row, refs, { create: true });
      await cleanupOrphans(uploaded.orphaned);
    } catch (e) {
      const err = e as ContentError;
      return fail(400, {
        record: { ...row, ...refs, id },
        problem: { message: err.message, detail: err.detail }
      });
    }

    redirect(303, `/admin/content/${collection.key}/${id}?created=1`);
  }
};
