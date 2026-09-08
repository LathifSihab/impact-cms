/* Kinetic preloader — EXPERIENCES / CONNECTION / GROWTH / [IMPACT], then a split
 * curtain that tears the wordmark in half as it opens.
 *
 * The word is in the DOM twice, once in each panel: the top copy is anchored to
 * the top panel's bottom edge and the bottom copy to the bottom panel's top
 * edge, so together they read as one word straddling the seam. When the panels
 * part, the word tears with them — no masking layer, no extra element.
 *
 * Two things this file will not do, because a preloader that fails is worse than
 * no preloader at all:
 *   - it never decides whether to run. An inline script in <head> does that
 *     before first paint, and arms a failsafe that clears the overlay if this
 *     file or GSAP never arrives. Here we cancel that failsafe and take over.
 *   - it never holds the page longer than the timeline. Every exit path —
 *     reduced motion, no GSAP, a thrown error — ends in finish().
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var overlay = document.getElementById('preloader');

  // the inline script already decided; if the class is gone, so are we
  if (!overlay || !html.classList.contains('is-preloading')) return;

  function finish() {
    html.classList.remove('is-preloading');   // unlocks scroll, hides the overlay
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  /* The curtain is the moment the page is handed over, so the hero headline
     waits for this rather than playing its reveal behind a black panel. */
  function handOver() {
    document.dispatchEvent(new CustomEvent('impact:curtain'));
  }

  clearTimeout(window.__preFailsafe);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap) {
    handOver();
    finish();
    return;
  }

  var gsap = window.gsap;
  var panels = overlay.querySelectorAll('.pre-panel');
  var cycles = Array.prototype.slice.call(overlay.querySelectorAll('[data-pre-cycle]'));
  var finals = Array.prototype.slice.call(overlay.querySelectorAll('[data-pre-final]'));

  /* GSAP owns the centring, not CSS: xPercent/yPercent stay true percentages of
     the element's own box, so a word of a different width re-centres itself. A
     CSS translate(-50%) would be parsed into pixels the first time GSAP touched
     the element and then go stale on the next word. */
  gsap.set(cycles.concat(finals), { x: 0, y: 0, xPercent: -50, yPercent: -50 });

  var CYCLE = ['EXPERIENCES', 'CONNECTION', 'GROWTH'];
  var BEAT = 0.24;          // per cycled word
  var LAND = 0.32;          // [IMPACT] arriving
  var HOLD = 0.26;          // [IMPACT] before the curtain
  var OPEN = 0.58;          // curtain

  function setWord(text) {
    cycles.forEach(function (el) { el.textContent = text; });
  }

  try {
    var tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finish
    });

    CYCLE.forEach(function (word, i) {
      var at = i * BEAT;
      tl.call(setWord, [word], at)
        .fromTo(cycles,
                { y: 26, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.18 }, at)
        .to(cycles, { y: -20, opacity: 0, duration: 0.08, ease: 'power2.in' },
            at + 0.18);
    });

    var reveal = CYCLE.length * BEAT;
    tl.set(cycles, { display: 'none' }, reveal)
      .fromTo(finals,
              { y: 30, opacity: 0, scale: 0.94 },
              { y: 0, opacity: 1, scale: 1, duration: LAND, ease: 'power4.out' }, reveal);

    var curtain = reveal + LAND + HOLD;
    tl.call(handOver, null, curtain)
      .to(panels[0], { yPercent: -100, duration: OPEN, ease: 'power4.inOut' }, curtain)
      .to(panels[1], { yPercent: 100, duration: OPEN, ease: 'power4.inOut' }, curtain);
    // 0.72 cycle + 0.32 land + 0.26 hold + 0.58 curtain = 1.88s, and the page is
    // uncovered progressively from 1.30s as the panels clear the viewport
  } catch (e) {
    handOver();
    finish();
  }
})();
