/* Consent layer — built, tested, and deliberately invisible until it has
 * something to ask about.
 *
 * The site sets no advertising or analytics cookies today. A banner now would
 * ask permission for nothing, and cookie banners cost signups — so USES below
 * is empty and nothing renders. The moment a category is added to it, the
 * banner appears on the next page load and the gating below starts applying,
 * with no further work and nothing to remember on the day.
 *
 * To put a category behind the banner:
 *
 *   1. add it to USES (the Dutch and English copy for it is already below)
 *   2. wherever the thing is loaded, wrap it:
 *        window.impactConsent.whenGranted('<category>', function () { ...load... });
 *
 * Both steps or neither. A category in USES with nothing gated behind it asks
 * permission for nothing; a gate with no category never opens.
 *
 * This applies to 'embeds' for anything third-party that stores state — a
 * hosted checkout, a video embed, a social feed. It does NOT apply to
 * Plausible, which stores nothing and runs unconditionally; see USES below.
 *
 * What is deliberately NOT gated: the preloader's sessionStorage flag and the
 * newsletter dome's "don't show me again" value. Both are strictly necessary
 * for something the visitor asked for, both are first-party, neither identifies
 * anyone, and consenting to "do not nag me again" would be absurd.
 */
(function () {
  'use strict';

  /* ---- the categories this site asks about ----
     'necessary' is not in here and never will be: it cannot be declined, so
     offering it as a choice would be theatre. It is shown in the preferences
     panel as permanently on, which is the honest way to present it.

     'analytics' is deliberately NOT here. Plausible runs unconditionally: it
     sets no cookies, stores nothing on the device and anonymises IPs, so there
     is no permission to ask for, and a Statistics toggle that gated nothing
     would be theatre. If legal review decides otherwise, this category and the
     gate around the snippet in SiteShell.svelte come back together — one
     without the other either makes the banner a lie or asks about nothing.

     'marketing' stays: the box-office embed is third-party and does store
     state. The gate exists before the tracker does, so whatever is added later
     is covered by a choice the visitor has already made rather than appearing
     behind their back and needing a second ask. */
  var USES = ['marketing'];

  var KEY = 'impact.consent';
  var VERSION = 1;                 // bump to re-ask after a material change
  var html = document.documentElement;
  var isEN = (html.lang || 'nl').slice(0, 2) === 'en';

  var COPY = {
    nl: {
      title: 'Cookies op deze site',
      body: 'We gebruiken cookies om je bezoek te verbeteren en het verkeer op de site ' +
            'te analyseren. Lees onze privacyverklaring voor meer uitleg.',
      state: 'Vandaag plaatsen we er nog geen — je keuze geldt zodra dat verandert.',
      accept: 'Alles aanvaarden',
      reject: 'Alleen noodzakelijke',
      prefs: 'Voorkeuren aanpassen',
      save: 'Bewaar mijn keuze',
      policy: 'privacyverklaring',
      necessary: ['Noodzakelijk',
                  'Nodig om de site te laten werken — bijvoorbeeld onthouden dat je ' +
                  'dit venster al hebt beantwoord. Kan niet uitgezet worden.'],
      cats: {
        analytics: ['Statistieken',
                    'Hoeveel mensen de site bezoeken en welke pagina’s ze lezen, ' +
                    'zodat we hem kunnen verbeteren.'],
        marketing: ['Marketing',
                    'Meten welke campagne of bericht iemand naar de site bracht. ' +
                    'Geen advertentieprofielen.']
      }
    },
    en: {
      title: 'Cookies on this site',
      body: 'We use cookies to enhance your browsing experience and analyse site ' +
            'traffic. Read our privacy statement to learn more.',
      state: 'We are not setting any yet — your choice applies the moment that changes.',
      accept: 'Accept all',
      reject: 'Necessary only',
      prefs: 'Manage preferences',
      save: 'Save my choice',
      policy: 'privacy statement',
      necessary: ['Necessary',
                  'Needed for the site to work — remembering that you have answered ' +
                  'this panel, for instance. Cannot be switched off.'],
      cats: {
        analytics: ['Statistics',
                    'How many people visit and which pages they read, so we can ' +
                    'improve it.'],
        marketing: ['Marketing',
                    'Measuring which campaign or post brought someone here. ' +
                    'No advertising profiles.']
      }
    }
  }[isEN ? 'en' : 'nl'];

  var POLICY = isEN ? '/en/privacy.html' : '/privacy.html';

  /* ---- stored decision ---- */
  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || raw.v !== VERSION) return null;
      // a decision made before a new category existed is not a decision about it
      for (var i = 0; i < USES.length; i++) {
        if ((raw.asked || []).indexOf(USES[i]) === -1) return null;
      }
      return raw;
    } catch (e) { return null; }
  }

  function write(granted) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: VERSION, ts: Date.now(), asked: USES.slice(), granted: granted
      }));
    } catch (e) { /* storage blocked: the choice holds for this page only */ }
  }

  var decision = read();
  var listeners = [];

  function granted(cat) {
    return !!decision && decision.granted.indexOf(cat) > -1;
  }

  function settle(list) {
    decision = { v: VERSION, ts: Date.now(), asked: USES.slice(), granted: list };
    write(list);
    listeners.forEach(function (l) { if (granted(l.cat)) l.fn(); });
    listeners = listeners.filter(function (l) { return !granted(l.cat); });
  }

  /* ---- public API ---- */
  window.impactConsent = {
    granted: granted,
    whenGranted: function (cat, fn) {
      if (USES.indexOf(cat) === -1) return;   // not in use: never runs, never asks
      if (granted(cat)) { fn(); return; }
      listeners.push({ cat: cat, fn: fn });
    },
    open: function () { render(true); }
  };

  /* the footer entry point only makes sense once there is something to change */
  var opener = document.querySelector('[data-consent-open]');
  if (opener && USES.length) {
    opener.hidden = false;
    opener.addEventListener('click', function () { render(true); });
  }

  if (!USES.length) return;         // dormant: nothing to ask, so nothing to draw
  if (decision) {
    listeners = [];
    USES.forEach(function (c) { if (granted(c)) { /* consumers ran already */ } });
    return;
  }

  /* ---- the banner ---- */
  var el = null;
  var lastFocus = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(showPrefs) {
    if (el) { el.remove(); el = null; }
    lastFocus = document.activeElement;

    var rows = '<div class="consent-cat is-locked">' +
      '<input type="checkbox" id="consent-necessary" checked disabled>' +
      '<label for="consent-necessary"><b>' + esc(COPY.necessary[0]) + '</b>' +
      '<span>' + esc(COPY.necessary[1]) + '</span></label></div>' +
      USES.map(function (cat) {
        var c = COPY.cats[cat] || [cat, ''];
        return '<div class="consent-cat">' +
               '<input type="checkbox" id="consent-' + esc(cat) + '" value="' + esc(cat) + '">' +
               '<label for="consent-' + esc(cat) + '"><b>' + esc(c[0]) + '</b>' +
               '<span>' + esc(c[1]) + '</span></label></div>';
      }).join('');

    el = document.createElement('div');
    el.className = 'consent' + (showPrefs ? ' consent--prefs' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-label', COPY.title);
    el.innerHTML =
      '<div class="consent-inner">' +
        '<div class="consent-text">' +
          '<h2>' + esc(COPY.title) + '</h2>' +
          '<p>' + esc(COPY.body).replace(esc(COPY.policy),
              '<a href="' + POLICY + '">' + esc(COPY.policy) + '</a>') +
            '</p>' +
          '<p class="consent-state">' + esc(COPY.state) + '</p>' +
          '<div class="consent-cats">' + rows + '</div>' +
        '</div>' +
        '<div class="consent-actions">' +
          '<button type="button" class="consent-btn" data-none>' + esc(COPY.reject) + '</button>' +
          '<button type="button" class="consent-btn" data-all>' + esc(COPY.accept) + '</button>' +
          '<button type="button" class="linkish" data-prefs>' + esc(COPY.prefs) + '</button>' +
          '<button type="button" class="consent-btn" data-save>' + esc(COPY.save) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    function done(list) {
      settle(list);
      el.remove(); el = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    el.querySelector('[data-all]').addEventListener('click', function () { done(USES.slice()); });
    el.querySelector('[data-none]').addEventListener('click', function () { done([]); });
    el.querySelector('[data-prefs]').addEventListener('click', function () {
      el.classList.add('consent--prefs');
      var first = el.querySelector('.consent-cat input');
      if (first) first.focus();
    });
    el.querySelector('[data-save]').addEventListener('click', function () {
      done(Array.prototype.filter
        .call(el.querySelectorAll('.consent-cat input'), function (i) { return i.checked; })
        .map(function (i) { return i.value; }));
    });

    // no focus trap and aria-modal="false" on purpose: this is a banner, not a
    // wall. The page stays readable and operable while the choice is pending,
    // which is both kinder and what a regulator expects of a genuine choice.
    var firstBtn = el.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }

  render(false);
})();
