/* Section-engagement events for Plausible.
 *
 * Plausible itself is loaded by the snippet in the server-rendered <head> (see
 * SiteShell.svelte). It has to be there rather than here: Plausible's own
 * integration check reads the raw HTML and cannot see a script that JavaScript
 * added, and the pa-*.js format counts nothing until plausible.init() runs.
 * This file used to do that loading, set data-domain — which pa-*.js ignores
 * entirely — and never called init(), so not one event was ever sent.
 *
 * What is left here is the part stock Plausible does not answer. The brief asks
 * for "page/section engagement": Plausible counts pageviews, not whether anyone
 * reached the part of the page that matters. One event per section, once per
 * pageview, when it has been properly seen rather than merely scrolled past.
 *
 * Not gated behind the consent banner, and neither is the snippet. Plausible
 * sets no cookies, stores nothing on the device and anonymises IPs, so there is
 * no permission to ask for — and the Statistics category has been removed from
 * consent.js to match. If IMPACT's lawyers would rather it were gated, both
 * changes reverse together: re-add the category AND wrap the snippet. Doing one
 * without the other either makes the banner a lie or asks about nothing.
 */
(function () {
  'use strict';

  /* No account configured means no snippet in the head, so there is nothing for
     these events to reach. */
  var meta = document.querySelector('meta[name="plausible-domain"]');
  if (!meta || !meta.getAttribute('content')) return;

  /* The snippet defines window.plausible as a queue before the real script
     arrives, so calling it early is safe and nothing is lost. Guarded anyway in
     case the head snippet is ever removed without this file going with it. */
  if (typeof window.plausible !== 'function') return;

  if (!('IntersectionObserver' in window)) return;

  var sections = document.querySelectorAll('section[id], header[id]');
  if (!sections.length) return;

  var seen = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || seen[e.target.id]) return;
      seen[e.target.id] = true;
      io.unobserve(e.target);
      window.plausible('section_view', {
        props: { section: e.target.id, page: location.pathname }
      });
    });
  }, { threshold: 0.4 });

  Array.prototype.forEach.call(sections, function (s) { io.observe(s); });
})();
