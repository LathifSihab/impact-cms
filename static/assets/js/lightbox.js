/* Lightbox for the beeldarchief.
 *
 * The gallery is already six real buttons wrapping six real <picture> elements,
 * so this file adds a view and never the content: with it blocked, the images
 * are still there, still legible, still keyboard-reachable. That is the whole
 * design constraint — a press page whose pictures depend on JavaScript is a
 * press page that fails for the one visitor who matters.
 *
 * It opens the widest file in each picture's srcset rather than the thumbnail
 * the browser already has. That costs one small download and is the whole point
 * of clicking: an enlarged 420px thumbnail is not an enlargement.
 */
(function () {
  'use strict';

  var gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;

  var shots = Array.prototype.slice.call(gallery.querySelectorAll('[data-shot-open]'));
  if (!shots.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var box = null;
  var index = 0;
  var lastFocus = null;

  function sourceOf(shot) {
    var img = shot.querySelector('img');
    /* Open the largest candidate, not currentSrc. currentSrc is whatever the
       browser picked for a thumbnail slot — 420w here — and enlarging that on a
       press page defeats the point of enlarging it. The widest entry in the
       srcset costs one small download and is the picture the visitor asked for.
       Falls back to whatever is loaded if there is no srcset to read. */
    var best = null, bestW = 0;
    var sets = shot.querySelectorAll('source[srcset], img[srcset]');
    Array.prototype.forEach.call(sets, function (el) {
      var type = el.getAttribute('type');
      if (type && type !== 'image/webp' && type !== 'image/jpeg') return;  // skip avif for reach
      el.getAttribute('srcset').split(',').forEach(function (part) {
        var bits = part.trim().split(/\s+/);
        var w = parseInt(bits[1] || '0', 10);
        if (w > bestW) { bestW = w; best = bits[0]; }
      });
    });
    return { src: best || img.currentSrc || img.src, alt: img.getAttribute('alt') || '' };
  }

  function captionOf(shot) {
    var cap = shot.querySelector('.shot-cap');
    return cap ? cap.textContent.trim() : sourceOf(shot).alt;
  }

  function render() {
    var pic = sourceOf(shots[index]);
    box.querySelector('img').src = pic.src;
    box.querySelector('img').alt = pic.alt;
    box.querySelector('.lb-text').textContent = captionOf(shots[index]);
    box.querySelector('.lb-cap .n').textContent =
      (index + 1) + ' / ' + shots.length;
  }

  function go(step) {
    index = (index + step + shots.length) % shots.length;
    render();
  }

  function close() {
    if (!box) return;
    box.remove();
    box = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight') { go(1); return; }
    if (e.key === 'ArrowLeft') { go(-1); return; }
    if (e.key !== 'Tab' || !box) return;
    // a modal that can be tabbed out of is a modal in name only
    var f = box.querySelectorAll('button');
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  function open(i) {
    index = i;
    lastFocus = document.activeElement;

    box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Beeldarchief');
    box.innerHTML =
      '<button type="button" class="lb-close" aria-label="Sluiten">&times;</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Vorige">&lsaquo;</button>' +
      '<figure class="lb-figure"><img alt="">' +
        '<figcaption class="lb-cap"><span class="lb-text"></span><span class="n"></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Volgende">&rsaquo;</button>';
    document.body.appendChild(box);
    document.body.style.overflow = 'hidden';
    render();

    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function () { go(-1); });
    box.querySelector('.lb-next').addEventListener('click', function () { go(1); });
    // clicking the backdrop closes; clicking the picture does not
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });
    document.addEventListener('keydown', onKey);

    // swipe, because the arrows are hidden on a phone
    var x0 = null;
    box.addEventListener('touchstart', function (e) {
      x0 = e.changedTouches[0].clientX;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    box.querySelector('.lb-close').focus();
  }

  shots.forEach(function (shot, i) {
    shot.addEventListener('click', function () { open(i); });
  });

  // reduced motion keeps the lightbox, only the fade goes — it is navigation,
  // not decoration, and removing it would remove a way to see the pictures
  if (reduced) document.documentElement.classList.add('lb-no-motion');
})();
