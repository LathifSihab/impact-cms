/* Ticket Tailor box office, behind the consent banner.
 *
 * Inert until a box office exists. The build writes
 * <meta name="tt-box-office"> only when PUBLIC_TICKET_TAILOR_BOX_OFFICE is set
 * (tools/seo.py), so with no account configured there is no widget, no third-
 * party script, and nothing in the page that has to be explained.
 *
 * Three decisions worth keeping:
 *
 * The account is never written in the markup. Ticket Tailor's own snippet
 * hardcodes the box office slug and an account ref. Pasting that would put an
 * account id in twenty HTML files, and handover would become a code change. The
 * URL comes from the environment, like the Plausible domain.
 *
 * The fallback link is server-rendered and always present. It is a plain link
 * to the box office, so the page works with no JavaScript, before consent, and
 * if Ticket Tailor's CDN is unreachable. The widget replaces it; it is never a
 * placeholder for something that might not arrive.
 *
 * Gated on 'marketing' consent because the widget is a third-party script that
 * sets its own cookies. It is not analytics, and it is not strictly necessary —
 * the link underneath does the same job. Failing closed is the only safe
 * direction when the thing that asks permission is the thing that is missing.
 */
(function () {
  var meta = document.querySelector('meta[name="tt-box-office"]');
  var url = meta && meta.content;
  if (!url) return;

  var mounts = document.querySelectorAll('[data-box-office]');
  if (!mounts.length) return;

  /* Point every fallback link at the configured box office, so the markup does
     not carry the account either. */
  Array.prototype.forEach.call(mounts, function (mount) {
    var link = mount.querySelector('a[data-box-office-link]');
    if (link) link.href = url;
  });

  var loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;

    Array.prototype.forEach.call(mounts, function (mount) {
      var widget = document.createElement('div');
      widget.className = 'tt-widget';

      var s = document.createElement('script');
      s.src = 'https://cdn.tickettailor.com/js/widgets/min/widget.js';
      s.setAttribute('data-url', url);
      s.setAttribute('data-type', 'inline');
      s.setAttribute('data-inline-minimal', 'true');
      s.setAttribute('data-inline-show-logo', 'false');
      s.setAttribute('data-inline-bg-fill', 'true');
      s.setAttribute('data-inline-ref', 'website_widget');

      /* If the CDN never answers, leave the fallback link exactly where it is
         rather than showing an empty box where tickets should be. */
      s.addEventListener('error', function () {
        widget.parentNode && widget.parentNode.removeChild(widget);
        loaded = false;
      });

      widget.appendChild(s);
      mount.appendChild(widget);
      mount.setAttribute('data-box-office', 'live');
    });
  }

  if (window.impactConsent && window.impactConsent.whenGranted) {
    window.impactConsent.whenGranted('marketing', load);
  }
})();
