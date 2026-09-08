/* Plausible, behind the consent banner.
 *
 * Inert until a domain exists. The build writes <meta name="plausible-domain">
 * from PUBLIC_PLAUSIBLE_DOMAIN; with no domain this file loads nothing and costs
 * one meta lookup. So it can ship before the account does, and the account
 * turning up is a one-variable change rather than a code change.
 *
 * Why gated, when Plausible sets no cookies and legally needs no consent: we
 * show a banner that offers a Statistics category. Loading analytics after
 * somebody chose "Necessary only" would make that banner a lie. If IMPACT's
 * lawyer would rather it ran unconditionally — a defensible position for a
 * cookieless, IP-anonymising tool — drop the whenGranted wrapper and remove the
 * category from consent.js. Do both or neither.
 *
 * The queue below matters more than it looks. main.js fires goals the moment
 * they happen, and consent may arrive seconds later or never. Without it, every
 * conversion before the visitor clicks "Accept" is lost — which is most of them,
 * because people scroll first and answer the banner afterwards.
 */
(function () {
  'use strict';

  var meta = document.querySelector('meta[name="plausible-domain"]');
  var domain = meta && meta.getAttribute('content');
  if (!domain) return;                       // no account yet: do nothing at all

  var src = (document.querySelector('meta[name="plausible-src"]') || {}).content ||
            'https://plausible.io/js/script.outbound-links.js';

  var queue = [];
  var live = false;

  /* Stand in for plausible() until the real one loads, so nothing fires into a
     void. Plausible's own snippet does this too; ours also has to survive the
     window where consent has not been given yet. */
  window.plausible = window.plausible || function () {
    if (live) return;                        // the real one has taken over
    queue.push(arguments);
    if (queue.length > 40) queue.shift();    // a session cannot be unbounded
  };

  function load() {
    if (live) return;
    live = true;
    var s = document.createElement('script');
    s.defer = true;
    s.setAttribute('data-domain', domain);
    s.src = src;
    s.addEventListener('load', function () {
      // hand the backlog to the real implementation
      queue.forEach(function (args) {
        try { window.plausible.apply(null, args); } catch (e) { /* one bad call */ }
      });
      queue = [];
    });
    s.addEventListener('error', function () { live = false; });
    document.head.appendChild(s);
  }

  if (window.impactConsent && window.impactConsent.whenGranted) {
    window.impactConsent.whenGranted('analytics', load);
  } else {
    // consent.js absent or failed: do not load. Failing closed is the only safe
    // direction when the thing that asks permission is the thing that is missing.
    return;
  }

  /* ---- section engagement ----
     The brief asks for "page/section engagement", which stock Plausible does not
     answer: it counts pageviews, not whether anyone reached the part of the page
     that matters. One event per section, once per pageview, when it has been
     properly seen rather than merely scrolled past. */
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
