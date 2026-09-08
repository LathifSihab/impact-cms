import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Only `en` is a language segment. Dutch is the site's default and lives at the
 * root, matching the live URLs — /events and /en/events, not /nl/events.
 *
 * Without this matcher an optional [[lang]] would swallow /events as a language
 * called "events" and every Dutch page would 404.
 */
export const match: ParamMatcher = (param) => param === 'en';
