/**
 * Regression test for the site's own JavaScript.
 *
 * Both of these broke once, for the same reason: the scripts were loaded from
 * <svelte:head>, so they ran before hydration and bound their listeners to
 * nodes Svelte then replaced. The dome's close button stopped closing anything,
 * and [data-reveal] elements never got `.is-in`, which leaves them at opacity:0
 * because that is what the stylesheet does while `.js` is on the root.
 *
 * Needs the dev server running: npm run dev, then npm run test:behaviour.
 *
 * Loads the served page into jsdom, runs the site's own scripts the way the
 * page now does (after the DOM is in place), and checks:
 *   1. the newsletter dome can be opened and then closed
 *   2. [data-reveal] elements receive `.is-in` when they enter the viewport
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_UNDER_TEST = process.argv[2] ?? 'http://localhost:5273/events';
const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'assets', 'js');

const html = await (await fetch(URL_UNDER_TEST)).text();

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', () => {}); // CSS parse noise from the real stylesheet

const dom = new JSDOM(html, {
  url: URL_UNDER_TEST,
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;

// jsdom has no IntersectionObserver; stand one in that fires immediately, which
// is what "the element is on screen" means for this test.
window.IntersectionObserver = class {
  constructor(cb) {
    this.cb = cb;
    this.els = [];
  }
  observe(el) {
    this.els.push(el);
    this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this);
  }
  unobserve() {}
  disconnect() {}
};
window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.scrollTo = () => {};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// Run the site's scripts in order, as the layout now does after hydration.
for (const file of ['consent.js', 'main.js', 'boxoffice.js']) {
  try {
    window.eval(readFileSync(join(JS_DIR, file), 'utf8'));
  } catch (e) {
    console.log(`  (script ${file} threw: ${e.message})`);
  }
}

const doc = window.document;

/* ---- 1. the dome ---- */
const dome = doc.getElementById('dome');
check('dome exists in the markup', !!dome);

if (dome) {
  const closeBtn = dome.querySelector('.dome-close');
  check('dome has a close button', !!closeBtn);

  // Open it the way main.js does, then click close.
  dome.hidden = false;
  const before = dome.hidden;
  closeBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check(
    'clicking the close button closes the dome',
    before === false && dome.hidden === true,
    `hidden: ${before} -> ${dome.hidden}`
  );

  // Escape should close it too.
  dome.hidden = false;
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes the dome', dome.hidden === true, `hidden: ${dome.hidden}`);
}

/* ---- 2. reveal on scroll ---- */
const reveals = [...doc.querySelectorAll('[data-reveal]')];
const revealed = reveals.filter((el) => el.classList.contains('is-in'));
if (reveals.length === 0) {
  // Not every page has scroll reveals — the static journal.html has none
  // either, only a hero reveal root. Absence is not a failure.
  console.log('  ----  no [data-reveal] elements on this page (matches the static site)');
} else {
  check(
    'reveal elements are marked visible once observed',
    revealed.length === reveals.length,
    `${revealed.length}/${reveals.length} have .is-in`
  );
}

/* ---- 3. the hero reveal root ---- */
const heroRoot = doc.querySelector('[data-reveal-root]');
check('hero reveal root exists', !!heroRoot);
if (heroRoot) {
  // main.js adds is-revealed on rAF or after the curtain event.
  await new Promise((r) => setTimeout(r, 100));
  check(
    'hero is revealed',
    heroRoot.classList.contains('is-revealed'),
    heroRoot.className
  );
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
