/**
 * Create the configurable pages from the static site's own HTML.
 *
 * The alternative was eight empty pages for the client to fill in, or eight
 * pages of invented copy. Both are worse: 06-CMS-SCOPE.md is explicit that the
 * client recognises their own words and that placeholder text reads as
 * unfinished, and an empty Page Configuration screen demonstrates nothing.
 *
 * So this reads site/*.html and lifts what it can recognise:
 *
 *   hero        the header's label, h1 and intro
 *   sec_head    .sec-head blocks — running, h2, lead
 *   media_text  .two-col--media blocks — running, h2, intro, ticks, cta
 *   cta_cards   the .cta-cards strip
 *   band        .band
 *   news_band   .news-band
 *
 * It is a lift, not a parse of every page. The bespoke bits — the homepage
 * cinema reel, the founders block, the contact form — are not section types and
 * are reported as skipped rather than mangled into something that looks right
 * and is not. Whatever it cannot place, a human places in the editor.
 *
 * Idempotent: pages are upserted by slug and their sections replaced.
 *
 * Run: npm run seed:pages
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envHelp } from './env-help.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(join(root, '.env'));

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(envHelp(root));
  process.exit(1);
}

/* The bracketed names of the real formats — [Camps], [Days], … — read once.
   Three pages use .format-row markup, but only two of them are listing formats:
   Samenwerken hand-writes five rows of its own ("Partner [worden]") in exactly
   the same shape. Comparing the names is what tells them apart, rather than
   hardcoding which page is which. */
let FORMAT_NAMES: string[] = [];

const SITE = process.env.IMPACT_SITE_DIR
  ? resolve(process.env.IMPACT_SITE_DIR)
  : resolve(root, '..', 'site');

if (!existsSync(SITE)) {
  console.error(
    `Geen site gevonden op ${SITE}.\n` +
      'Wijs ernaar met IMPACT_SITE_DIR=/pad/naar/site npm run seed:pages'
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/* --- the pages, in the order they belong in the backoffice ---------------- */

const PAGES: { id: string; file: string; navLabel: string; heroVariant: string }[] = [
  { id: 'home', file: 'index.html', navLabel: 'Home', heroVariant: 'home' },
  { id: 'over', file: 'over.html', navLabel: 'Over IMPACT', heroVariant: 'overlaid' },
  { id: 'samenwerken', file: 'samenwerken.html', navLabel: 'Samenwerken', heroVariant: 'page' },
  { id: 'social-impact', file: 'social-impact.html', navLabel: 'Social Impact', heroVariant: 'page' },
  {
    id: 'hosted-experiences',
    file: 'hosted-experiences.html',
    navLabel: 'Hosted Experiences',
    heroVariant: 'event'
  },
  { id: 'media', file: 'media.html', navLabel: 'Media', heroVariant: 'page' },
  { id: 'contact', file: 'contact.html', navLabel: 'Contact', heroVariant: 'page' },
  { id: 'privacy', file: 'privacy.html', navLabel: 'Privacyverklaring', heroVariant: 'page' }
];

/* --- extraction ----------------------------------------------------------- */

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/&bull;/g, '•')
    .replace(/&times;/g, '×')
    .replace(/&euro;/g, '€')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    // Soft hyphens are a typesetting hint in the HTML. They have no place in
    // stored copy, where they would show up as literal text in an input.
    .replace(/&shy;/g, '')
    // Anything numeric that is left, decoded generically rather than one at a time.
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();

const first = (html: string, re: RegExp): string => {
  const m = html.match(re);
  return m ? decode(m[1]) : '';
};

interface Section {
  type: string;
  ground: string;
  anchor: string | null;
  content: Record<string, unknown>;
}

function extractHero(html: string) {
  const header = html.match(/<header class="hero[^"]*"[\s\S]*?<\/header>/);
  const block = header ? header[0] : '';

  /* The homepage hero puts its standfirst in .hero-bottom rather than in a
     .intro paragraph, and adds a trust list and two buttons. Reading both
     shapes here means one hero record covers every page. */
  const bottom = block.match(/<div class="hero-bottom[^"]*">([\s\S]*?)<\/div>\s*<\/div>/);
  const trustBlock = block.match(/<ul class="trust[^"]*">([\s\S]*?)<\/ul>/);
  const buttons = [...block.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  const anchorBlock = block.match(/<nav class="anchor-nav[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
  /* Take everything from .overlay-meta to the end of the hero and pull the
     items out of it. Trying to close the div with a regex stopped at the first
     nested </div> and lost the third block. */
  const overlayStart = block.indexOf('class="overlay-meta');
  const overlayBlock: [string, string] | null =
    overlayStart === -1 ? null : ['', block.slice(overlayStart)];

  return {
    label: first(block, /<span class="label[^"]*">([\s\S]*?)<\/span>/),
    title: first(block, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    intro:
      first(block, /<p class="intro[^"]*">([\s\S]*?)<\/p>/) ||
      (bottom ? first(bottom[1], /<p>([\s\S]*?)<\/p>/) : ''),
    image: (block.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? null,
    trust: trustBlock
      ? [...trustBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => decode(li[1]))
      : [],
    ctaLabel: buttons[0] ? decode(buttons[0][2]) : '',
    ctaHref: buttons[0] ? localise(buttons[0][1]) : '',
    cta2Label: buttons[1] ? decode(buttons[1][2]) : '',
    cta2Href: buttons[1] ? localise(buttons[1][1]) : '',
    /* The in-page jump links, and the blocks laid over the image. Four pages
       carry the nav; only Over carries the meta. */
    anchorNav: anchorBlock
      ? [...anchorBlock[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((a) => ({
          href: localise(a[1]),
          label: decode(a[2])
        }))
      : [],
    overlayMeta: overlayBlock
      ? [...overlayBlock[1].matchAll(/<div class="item">([\s\S]*?)<\/div>/g)].map((it) => ({
          heading: first(it[1], /<h3>([\s\S]*?)<\/h3>/),
          body: first(it[1], /<p>([\s\S]*?)<\/p>/)
        }))
      : []
  };
}

/**
 * `events.html#upcoming` -> `/events#upcoming`.
 *
 * Links lifted out of the static HTML point at .html files. The CMS serves
 * those addresses now, so a hero button that kept the old href would walk the
 * visitor off the page they are on.
 */
function localise(href: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
  const [file, hash] = href.split('#');
  const slug = file.replace(/\.html$/, '').replace(/^\//, '');
  if (!slug || slug === 'index') return `/${hash ? '#' + hash : ''}`;
  return `/${slug}${hash ? '#' + hash : ''}`;
}

function groundOf(openTag: string): string {
  if (openTag.includes('section--black')) return 'black';
  if (openTag.includes('section--sand')) return 'sand';
  if (openTag.includes('section--red')) return 'red';
  return 'white';
}

function anchorOf(openTag: string): string | null {
  const m = openTag.match(/id="([^"]+)"/);
  return m ? m[1] : null;
}

function extractSections(html: string): { sections: Section[]; skipped: string[] } {
  const sections: Section[] = [];
  const skipped: string[] = [];

  const re = /<section\b([^>]*)>([\s\S]*?)<\/section>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const attrs = m[1];
    const inner = m[2];
    const ground = groundOf(attrs);
    const anchor = anchorOf(attrs);

    if (attrs.includes('cta-cards')) {
      const cards = [...inner.matchAll(/<div class="cta-card cta-card--([a-z]+)"[\s\S]*?<\/div>/g)].map(
        (c) => ({
          variant: c[1],
          title: first(c[0], /<h3[^>]*>([\s\S]*?)<\/h3>/),
          text: first(c[0], /<p[^>]*>([\s\S]*?)<\/p>/),
          ctaLabel: first(c[0], /<a class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/),
          ctaHref: (c[0].match(/<a class="pill[^"]*"[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
        })
      );
      if (cards.length) sections.push({ type: 'cta_cards', ground: 'white', anchor, content: { cards } });
      continue;
    }

    /* The newsletter form, in either of the two layouts the site uses: the
       narrow band most pages end on, and the two-column block where the copy
       sits beside the field. Both are the same section type. */
    if (attrs.includes('news-band') || (inner.includes('two-col--form') && inner.includes('data-newsletter'))) {
      sections.push({
        type: 'news_band',
        ground: 'white',
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          body: first(inner, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
          style: inner.includes('two-col--form') ? 'two_col' : 'band'
        }
      });

      continue;
    }

    if (attrs.includes('class="band"') || attrs.includes(' band')) {
      sections.push({
        type: 'band',
        ground: 'black',
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          ctaLabel: first(inner, /<a class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/),
          ctaHref: (inner.match(/<a class="pill[^"]*"[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
        }
      });
      continue;
    }

    /* The numbered blocks appear twice on the site with different styling:
       .routes on the homepage and .layers on Over. One section type, one
       switch, rather than two types that would drift apart. */
    /* Three pages use .format-row markup, but only two of them are listing
       formats — Samenwerken hand-writes five rows of its own ("Partner
       [worden]") in exactly the same shape. Comparing the names against the
       real records is what tells them apart, rather than hardcoding pages. */
    const rowNames = [...inner.matchAll(/<span class="name">([\s\S]*?)<\/span>/g)].map((x) =>
      decode(x[1].replace(/<[^>]+>/g, ' '))
    );
    const formatRowsAreRecords =
      rowNames.length > 0 &&
      rowNames.every((n) =>
        FORMAT_NAMES.some((f) => f && n.toLowerCase().includes(f.toLowerCase()))
      );

    if (
      inner.includes('class="routes"') ||
      inner.includes('class="layers"') ||
      inner.includes('class="step-card"') ||
      inner.includes('class="opt"') ||
      (inner.includes('class="format-row"') && !formatRowsAreRecords)
    ) {
      const style = inner.includes('class="routes"')
        ? 'routes'
        : inner.includes('class="layers"')
          ? 'layers'
          : inner.includes('class="step-card"')
            ? 'steps'
            : inner.includes('class="format-row"')
              ? 'format_rows'
              : 'options';
      const routes = style === 'routes';
      const cls = {
        routes: 'route',
        layers: 'layer',
        steps: 'step-card',
        options: 'opt',
        format_rows: 'format-row'
      }[style]!;
      const re2 = new RegExp(
        `<(?:a|div)[^>]*class="${cls}"[^>]*>([\\s\\S]*?)<\\/(?:a|div)>`,
        'g'
      );
      const items = [...inner.matchAll(re2)].map((row) => ({
        /* A format row's title is the styled name, which carries a <span
           class="red"> the site colours. Keeping the markup is the only way to
           render it back, so it is preserved and rendered as HTML. */
        title:
          style === 'format_rows'
            ? (row[1].match(/<span class="name">([\s\S]*?)<\/span>/) ?? ['', ''])[1].trim()
            : first(row[1], /<h3[^>]*>([\s\S]*?)<\/h3>/),
        body: first(row[1], /<p class="body[^"]*">([\s\S]*?)<\/p>/),
        meta: style === 'format_rows' ? first(row[1], /<span class="m">([\s\S]*?)<\/span>/) : '',
        ctaLabel: first(row[1], /<span class="tlink">([\s\S]*?)<\/span>/),
        ctaHref: localise((row[0].match(/<a[^>]*href="([^"]+)"/) ?? [])[1] ?? '')
      }));
      if (items.length) {
        sections.push({
          type: 'numbered_list',
          ground,
          anchor,
          content: {
            running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
            heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
            headingStyle: headingStyleOf(inner),
            lead: first(inner, /<p class="body">([\s\S]*?)<\/p>/),
            style,
            items
          }
        });
        continue;
      }
    }

    /* Blocks that are a content type shown a particular way. The records are
       already managed under Inhoud, so the page stores which type and how, not
       a copy of the words. */
    const asCollection: [string, string, string][] = [
      ['fund-long', 'foundations', 'fund_long'],
      ['strip-nav', 'foundations', 'strip'],
      ['class="age"', 'age_groups', 'age_cards'],
      ['expert-grid', 'experts', 'expert_grid'],
      ...(formatRowsAreRecords
        ? ([['format-row', 'formats', 'format_rows']] as [string, string, string][])
        : []),
      ['tier-table', 'tiers', 'tier_table'],
      ['logo-grid', 'partners', 'logo_grid'],
      ['stats--3', 'figures', 'stats']
    ];
    /* The team block also holds an expert-grid, but it is more than one: it
       carries the core-team cards and two headings around the grid. It has its
       own type, so it must not be swallowed here as a plain collection. */
    const match = inner.includes('class="team-cards"')
      ? undefined
      : asCollection.find(([needle]) => inner.includes(needle));
    if (match) {
      /* The strip carries a two-paragraph intro and a link under the progress
         bar. Reading both means the section round-trips rather than losing half
         its copy the first time someone saves it. */
      const introBlock = inner.match(/<div class="measure-2 strip-intro">([\s\S]*?)<\/div>/);
      const paras = introBlock
        ? [...introBlock[1].matchAll(/<p class="body">([\s\S]*?)<\/p>/g)].map((x) => decode(x[1]))
        : [];
      /* The small link is either in the section head ("Ontdek onze formats") or
         under the progress bar on the strip. One pair of fields covers both,
         because the presentation decides where it is rendered. */
      const foot = inner.match(/<a href="([^"]+)" class="tlink">([\s\S]*?)<\/a>/);

      sections.push({
        type: 'collection',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          lead: paras[0] ?? first(inner, /<p class="body">([\s\S]*?)<\/p>/),
          note: first(inner, /<p class="(?:body note|note body)">([\s\S]*?)<\/p>/),
          lead2: paras[1] ?? '',
          ctaLabel: foot ? decode(foot[2]) : '',
          ctaHref: foot ? localise(foot[1]) : '',
          source: match[1],
          presentation: match[2],
          limit: ''
        }
      });
      continue;
    }

    if (inner.includes('data-cinema') || inner.includes('reel-head')) {
      /* The caption is three separate elements on the site — a counter, the
         quote in bold, and who said it — so it is read as three fields rather
         than flattened into one string that could never be rendered back into
         the same markup. The counter itself is not stored: the renderer
         derives it from the clip's position, so it cannot drift out of step
         with the number of clips. */
      const clips = [...inner.matchAll(/<figure class="shot"[\s\S]*?<\/figure>/g)].map((sh) => ({
        webm: (sh[0].match(/src="([^"]+\.webm)"/) ?? [])[1] ?? '',
        mp4: (sh[0].match(/src="([^"]+\.mp4)"/) ?? [])[1] ?? '',
        poster: (sh[0].match(/poster="([^"]+)"/) ?? [])[1] ?? '',
        title: first(sh[0], /<b>([\s\S]*?)<\/b>/),
        meta: first(sh[0], /<span class="glass-m">([\s\S]*?)<\/span>/),
        alt: decode((sh[0].match(/aria-label="([^"]*)"/) ?? [])[1] ?? '')
      }));
      sections.push({
        type: 'reel',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          body: first(inner, /<p class="body">([\s\S]*?)<\/p>/),
          word: first(inner, /<p class="reel-word"[^>]*>([\s\S]*?)<\/p>/),
          note: first(inner, /<p class="reel-note">([\s\S]*?)<\/p>/),
          clips,
          // Never seeded on. The consent for these clips is not held, and the
          // seed is not the place to assert that it is.
          consentOnFile: ''
        }
      });
      continue;
    }

    /* The contact and request forms. Both pages post the same .wl-card shape,
       so one type carries them, with the fields as rows. */
    if (inner.includes('class="wl-card"') && inner.includes('<form')) {
      const form = inner.match(/<form[^>]*class="wl-card"[^>]*>([\s\S]*?)<\/form>/);
      const formTag = inner.match(/<form[^>]*class="wl-card"[^>]*>/);
      const body = form ? form[1] : '';
      const beside = inner.slice(0, inner.indexOf('<form'));
      const after = inner.slice(inner.indexOf('</form>'));

      const inputs = [...body.matchAll(/<div class="field">([\s\S]*?)<\/div>/g)].map((f) => {
        const block = f[1];
        const select = block.match(/<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/);
        const input = block.match(/<input[^>]*name="([^"]*)"[^>]*>/);
        const options = select
          ? [...select[2].matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)].map((o) => decode(o[1])).join('\n')
          : '';
        return {
          name: select ? select[1] : ((input?.[0].match(/name="([^"]*)"/) ?? [])[1] ?? ''),
          label: first(block, /<label[^>]*>([\s\S]*?)<\/label>/),
          type: select ? 'select' : ((input?.[0].match(/type="([^"]*)"/) ?? [])[1] ?? 'text'),
          autocomplete: (input?.[0].match(/autocomplete="([^"]*)"/) ?? [])[1] ?? '',
          options
        };
      });

      const privacy = body.match(/<p class="form-privacy">([\s\S]*?)<\/p>/);
      const privacyLink = privacy ? privacy[1].match(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/) : null;

      sections.push({
        type: 'form',
        ground,
        anchor,
        content: {
          running: first(beside, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(beside, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(beside),
          intro: first(beside, /<p class="intro">([\s\S]*?)<\/p>/),
          meta: first(beside, /<p class="meta">([\s\S]*?)<\/p>/),
          layout: inner.includes('two-col--form') ? 'two_col' : 'plain',
          formName: formTag ? ((formTag[0].match(/name="([^"]*)"/) ?? [])[1] ?? '') : '',
          formRunning: first(body, /<span class="running">([\s\S]*?)<\/span>/),
          formHeading: first(body, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          inputs,
          submitLabel: first(body, /<button[^>]*>([\s\S]*?)<\/button>/),
          privacy: privacy ? decode(privacy[1].replace(/<a[\s\S]*?<\/a>/, '')).trim() : '',
          privacyLinkLabel: privacyLink ? decode(privacyLink[2]) : '',
          privacyLinkHref: privacyLink ? localise(privacyLink[1]) : '',
          asideRunning: first(after, /<span class="running">([\s\S]*?)<\/span>/),
          practical: [...after.matchAll(/<div class="row"><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/div>/g)].map(
            (r) => ({ label: decode(r[1]), value: decode(r[2]) })
          ),
          asideHeading: first(after, /<h3 class="h"[^>]*>([\s\S]*?)<\/h3>/),
          shortcuts: [...after.matchAll(/<a class="dl-row" href="([^"]*)">([\s\S]*?)<\/a>/g)].map((r) => ({
            title: first(r[2], /<span class="t">([\s\S]*?)<\/span>/),
            meta: first(r[2], /<span class="m">([\s\S]*?)<\/span>/),
            href: localise(r[1])
          }))
        }
      });
      continue;
    }

    if (inner.includes('dl-list')) {
      /* A row is an <a> when there is a file behind it and a <div> when there
         is not, so the closing tag is matched as either rather than with a
         backreference. */
      const items = [
        ...inner.matchAll(/<(?:a|div)[^>]*class="dl-row[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/g)
      ].map((row) => ({
        title: first(row[1], /<span class="t">([\s\S]*?)<\/span>/),
        meta: first(row[1], /<span class="m">([\s\S]*?)<\/span>/),
        href: (row[0].match(/<a[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
      }));
      sections.push({
        type: 'downloads',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          items
        }
      });
      continue;
    }

    if (inner.includes('split-list')) {
      const columns = [...inner.matchAll(/<div>\s*<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)<\/div>/g)].map(
        (col) => ({
          title: decode(col[1]),
          items: [...col[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => decode(li[1]))
        })
      );
      sections.push({
        type: 'split_list',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          leftTitle: columns[0]?.title ?? '',
          leftItems: columns[0]?.items ?? [],
          rightTitle: columns[1]?.title ?? '',
          rightItems: columns[1]?.items ?? []
        }
      });
      continue;
    }

    /* A two-column block with a big kicker line — "IMPACT for all" on the
       homepage — is the same shape as a media_text without the picture. */
    if (inner.includes('two-col') && !inner.includes('two-col--media')) {
      const kickerRaw = inner.match(/<div class="d-m"[^>]*>([\s\S]*?)<\/div>/);
      const heading = first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/);
      /* The kicker is optional. Requiring it sent every plain two-column
         block — "Why we exist" on Over, and its picture — down to the prose
         fallback, which is why those pages read as flat text. */
      if (heading) {
        const red = kickerRaw ? first(kickerRaw[1], /<span class="red">([\s\S]*?)<\/span>/) : '';
        const plain = kickerRaw
          ? decode(kickerRaw[1].replace(/<span class="red">[\s\S]*?<\/span>/, ''))
          : '';
        const btns = [...inner.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
        sections.push({
          type: 'media_text',
          ground,
          anchor,
          content: {
            running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
            kicker: red ? `${plain} | ${red}` : plain,
            heading,
            headingStyle: headingStyleOf(inner),
            intro: first(inner, /<p class="intro"[^>]*>([\s\S]*?)<\/p>/),
            body: first(inner, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
            ticks: [],
            /* A plain two-col still often carries a picture in its other
               column — the social-impact block on the homepage does. Reading
               it here is the difference between that section having its image
               and quietly losing it. */
            image: (inner.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '',
            layout: 'plain',
            imageSide: 'right',
            ctaLabel: btns[0] ? decode(btns[0][2]) : '',
            ctaHref: btns[0] ? localise(btns[0][1]) : '',
            cta2Label: btns[1] ? decode(btns[1][2]) : '',
            cta2Href: btns[1] ? localise(btns[1][1]) : ''
          }
        });
        continue;
      }
    }

    if (inner.includes('two-col--media')) {
      const imgSrc = (inner.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '';
      const ticks = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((t) => decode(t[1])).filter(Boolean);
      // Image first in the markup means it renders on the left.
      const imageFirst = inner.indexOf('<img') !== -1 && inner.indexOf('<img') < inner.indexOf('<h2');
      sections.push({
        type: 'media_text',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(inner),
          intro: first(inner, /<p class="intro">([\s\S]*?)<\/p>/),
          body: first(inner, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
          ticks,
          image: imgSrc,
          layout: 'media',
          imageSide: imageFirst ? 'left' : 'right',
          ctaLabel: first(inner, /<a href="[^"]*" class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/),
          ctaHref: (inner.match(/<a href="([^"]+)" class="pill/) ?? [])[1] ?? ''
        }
      });
      continue;
    }

    /* The founders block: two long portraits with a citation each, then the
       shared closing note. */
    if (inner.includes('class="founder"')) {
      const people = [...inner.matchAll(/<div class="founder[^"]*">([\s\S]*?)(?=<div class="founder|<div class="duo)/g)].map(
        (b) => {
          const f = b[1];
          const bodies = [...f.matchAll(/<p class="body"[^>]*>([\s\S]*?)<\/p>/g)].map((x) => decode(x[1]));
          const quote = f.match(/<blockquote class="quote">([\s\S]*?)(?:<cite>([\s\S]*?)<\/cite>)?\s*<\/blockquote>/);
          return {
            image: (f.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '',
            tag: first(f, /<span class="tag">([\s\S]*?)<\/span>/),
            name: first(f, /<h3[^>]*>([\s\S]*?)<\/h3>/),
            role: first(f, /<p class="meta"[^>]*>([\s\S]*?)<\/p>/),
            intro: first(f, /<p class="intro"[^>]*>([\s\S]*?)<\/p>/),
            body: bodies[0] ?? '',
            body2: bodies[1] ?? '',
            quote: quote ? decode(quote[1].replace(/<cite>[\s\S]*?<\/cite>/, '')) : '',
            cite: quote && quote[2] ? decode(quote[2]) : ''
          };
        }
      );

      const duoBlock = inner.match(/<div class="duo">([\s\S]*?)<\/div>\s*<\/div>/);
      const duo = duoBlock ? duoBlock[1] : '';
      const duoBodies = [...duo.matchAll(/<p class="body"[^>]*>([\s\S]*?)<\/p>/g)].map((x) => decode(x[1]));
      const duoLink = duo.match(/<a href="([^"]+)" class="tlink">([\s\S]*?)<\/a>/);
      const headBlock = inner.match(/<div class="sec-head"[\s\S]*?<\/div>\s*<\/div>/);
      const head = headBlock ? headBlock[0] : inner;

      sections.push({
        type: 'founders',
        ground,
        anchor,
        content: {
          running: first(head, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(head, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(head),
          names: first(inner, /<p class="founder-names">([\s\S]*?)<\/p>/).replace(/\s+/g, ' '),
          lead: first(head, /<p class="body">([\s\S]*?)<\/p>/),
          people,
          duoImage: (duo.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '',
          duoRunning: first(duo, /<span class="running">([\s\S]*?)<\/span>/),
          duoHeading: first(duo, /<h3[^>]*>([\s\S]*?)<\/h3>/),
          duoBody: duoBodies[0] ?? '',
          duoBody2: duoBodies[1] ?? '',
          duoLinkLabel: duoLink ? decode(duoLink[2]) : '',
          duoLinkHref: duoLink ? localise(duoLink[1]) : ''
        }
      });
      continue;
    }

    /* Team & experts: the core-team cards, then the expert grid. The grid is
       left as a source rather than typed-out rows, so the confirmed gate keeps
       deciding who appears. */
    if (inner.includes('class="team-cards"')) {
      const cards = [...inner.matchAll(/<a class="team-card"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
        (b) => ({
          href: localise(b[1]),
          image: (b[2].match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '',
          tag: first(b[2], /<span class="tag">([\s\S]*?)<\/span>/),
          name: first(b[2], /<h4>([\s\S]*?)<\/h4>/),
          role: first(b[2], /<p class="r">([\s\S]*?)<\/p>/),
          body: first(b[2], /<p class="body">([\s\S]*?)<\/p>/),
          linkLabel: first(b[2], /<span class="tlink">([\s\S]*?)<\/span>/)
        })
      );
      const headings = [...inner.matchAll(/<h3 class="h"[^>]*>([\s\S]*?)<\/h3>/g)].map((x) => decode(x[1]));
      const afterCards = inner.slice(inner.indexOf('</div>', inner.indexOf('team-cards')));
      const headBlock = inner.match(/<div class="sec-head"[\s\S]*?<\/div>\s*<\/div>/);
      const head = headBlock ? headBlock[0] : inner;

      sections.push({
        type: 'team',
        ground,
        anchor,
        content: {
          running: first(head, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(head, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          headingStyle: headingStyleOf(head),
          lead: first(head, /<p class="body">([\s\S]*?)<\/p>/),
          cardsHeading: headings[0] ?? '',
          cards,
          cardsNote: first(afterCards, /<p class="meta"[^>]*>([\s\S]*?)<\/p>/),
          gridHeading: headings[1] ?? '',
          gridLead: first(afterCards, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
          source: inner.includes('expert-grid') ? 'experts' : ''
        }
      });
      continue;
    }

    if (inner.includes('sec-head')) {
      const head = inner.match(/<div class="sec-head"[\s\S]*?<\/div>\s*<\/div>|<div class="sec-head"[\s\S]*?<\/div>/);
      const block = head ? head[0] : inner;
      const heading = first(block, /<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (heading) {
        const link = block.match(/<a href="([^"]+)" class="tlink">([\s\S]*?)<\/a>/);
        sections.push({
          type: 'sec_head',
          ground,
          anchor,
          content: {
            running: first(block, /<span class="running">([\s\S]*?)<\/span>/),
            heading,
            headingStyle: headingStyleOf(block),
            lead: first(block, /<p class="body">([\s\S]*?)<\/p>/),
            /* The footnote under a list — the waiting-list caveat on the
               homepage's events block. It sits outside .sec-head, so it is
               read from the section rather than from the head. */
            note: first(inner, /<p class="(?:body note|note body)">([\s\S]*?)<\/p>/),
            ctaLabel: link ? decode(link[2]) : '',
            ctaHref: link ? localise(link[1]) : ''
          }
        });
        continue;
      }
    }

    /* Prose with a heading and no recognised structure is still content, and a
       page like /privacy is nothing but that. Lifting it as rich_text beats
       reporting the whole page as unrecognised and rendering it empty. */
    const heading = first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/);
    const paragraphs = [...inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((x) => decode(x[1]))
      .filter((t) => t.length > 40);
    const bullets = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .map((x) => decode(x[1]))
      .filter(Boolean);

    if (heading && (paragraphs.length || bullets.length)) {
      const bulletList = bullets.map((b) => `- ${b}`).join('\n');
      const body = [...paragraphs, ...(bulletList ? [bulletList] : [])].join('\n\n');
      sections.push({
        type: 'rich_text',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading,
          body
        }
      });
      continue;
    }

    // Genuinely bespoke markup with no section type behind it.
    const label = anchor ? `#${anchor}` : (heading || 'naamloze sectie');
    skipped.push(label.slice(0, 60));
  }

  /* The scrolling partner band sits BETWEEN the last </section> and the
     footer — it is not inside a section at all, which is why the loop above
     never sees it. The logos are partner records, so it is lifted as a
     collection rather than as fixed markup: add a partner under Inhoud and the
     band follows. */
  if (html.includes('class="marquee')) {
    const head = html.match(/<div class="mq-head">([\s\S]*?)<\/div>/);
    sections.push({
      type: 'collection',
      ground: 'white',
      anchor: '',
      content: {
        running: head ? first(head[1], /<span class="running">([\s\S]*?)<\/span>/) : '',
        heading: '',
        lead: '',
        note: head ? first(head[1], /<span class="mq-note">([\s\S]*?)<\/span>/) : '',
        source: 'partners',
        presentation: 'marquee',
        limit: ''
      }
    });
  }

  return { sections, skipped };
}

/**
 * Never overwrite an uploaded hero.
 *
 * Re-running this is meant to be safe, and the pages carry images uploaded in
 * the backoffice. Those live under /uploads and have no equivalent in the static
 * HTML, so re-deriving the hero from the file would silently throw them away —
 * which it did once before this existed. A legacy assets/... path has no such
 * claim and is replaced.
 */
async function keepUploadedHero(
  id: string,
  locale: string,
  candidate: string | null
): Promise<string | null> {
  const { data } = await db
    .from('pages')
    .select('hero_image')
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  const current = (data as { hero_image?: string } | null)?.hero_image ?? '';
  return current.startsWith('/uploads/') ? current : candidate;
}


/**
 * Give the homepage its live blocks.
 *
 * The extraction lifts the headings — "Six foundations", "Wat kan je binnenkort
 * meemaken?" — but the things they introduce are records, not markup, so the
 * lift leaves a heading with nothing under it. These insert a `collection`
 * section straight after each, so the homepage shows real foundations, real
 * editions and real articles, all still edited in Inhoud.
 */
/**
 * The heading's own size modifier, if it has one.
 *
 * The site sizes a title to how long it is — d-l--60 through d-l--40 — and
 * occasionally aligns it right. Dropping these on the way in is what turned
 * differently weighted headings into one uniform size.
 */
function headingStyleOf(block: string): string {
  const cls = (block.match(/<h2 class="([^"]*)"/) ?? [])[1] ?? '';
  const mod = cls.split(/\s+/).find((c) => /^d-l--\d+$/.test(c) || c === 'align-right');
  return mod ?? '';
}

function withHomeCollections(sections: Section[]): Section[] {
  const after: Record<string, { source: string; limit: string }> = {
    fundamenten: { source: 'foundations', limit: '' },
    events: { source: 'events', limit: '3' },
    'journal-teaser': { source: 'journal', limit: '4' }
  };

  return sections.map((section) => {
    const want = section.anchor ? after[section.anchor] : undefined;
    // The block may already have been lifted as a collection — the foundations
    // strip is one — in which case converting it again would lose the strip.
    if (!want || section.type === 'collection') return section;

    /* The heading and its list are ONE <section> on the site, so the heading
       is converted into the collection rather than a second section being
       appended after it. Two sections meant two lots of section padding
       between a heading and the cards it introduces, which is why the
       homepage's vertical rhythm came out flat and evenly spaced instead of
       grouping each heading with its content. */
    return {
      ...section,
      type: 'collection',
      content: { ...section.content, ...want }
    };
  });
}


/**
 * Keep uploaded images on sections, the same way heroes are kept.
 *
 * Sections are replaced wholesale on every run and their images are re-read
 * from the HTML, so a migrated or uploaded image would be overwritten by the
 * legacy assets/... path it came from. Matching on anchor — falling back to
 * position — is stable because the extraction is deterministic over the same
 * file.
 */
async function keepSectionImages(pageId: string, locale: string, next: Section[]): Promise<Section[]> {
  const { data } = await db
    .from('page_sections')
    .select('position, anchor, content')
    .eq('page_id', pageId)
    .eq('locale', locale);

  /* An uploaded value can sit anywhere in a section's content — `image` for a
     media block, but also `clips[2].poster` in the reel. Collecting them by
     their path through the object means every upload survives a reseed, not
     just the one at the top level. Reading only `image` here is what silently
     reverted the reel's clips to their seeded `assets/...` paths. */
  const managed = new Map<string, Map<string, string>>();
  const consents = new Map<string, string>();
  for (const row of (data ?? []) as Record<string, any>[]) {
    const key = row.anchor || `#${row.position}`;
    const found = new Map<string, string>();
    collectUploads(row.content ?? {}, '', found);
    if (found.size) managed.set(key, found);

    const consent = String(row.content?.consentOnFile ?? '');
    if (consent) consents.set(key, consent);
  }
  if (managed.size === 0 && consents.size === 0) return next;

  return next.map((section, i) => {
    const key = section.anchor || `#${i}`;
    let content = section.content;

    const keep = managed.get(key);
    if (keep) content = restoreUploads(content, '', keep) as Section['content'];

    /* A recorded consent is an editorial act, and reseeding must not undo it.
       The seed still never turns the tick ON — asserting a permission nobody
       gave is the one thing this flag exists to prevent — but it has no
       business turning OFF what someone deliberately recorded. */
    const consent = consents.get(key);
    if (consent && !content.consentOnFile) content = { ...content, consentOnFile: consent };

    return { ...section, content };
  });
}

/** Every `/uploads/` string in an object, keyed by its path: `clips.2.poster`. */
function collectUploads(value: unknown, path: string, out: Map<string, string>): void {
  if (typeof value === 'string') {
    if (value.startsWith('/uploads/')) out.set(path, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectUploads(v, path ? `${path}.${i}` : String(i), out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectUploads(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/**
 * Put the kept uploads back at the same paths in the freshly lifted content.
 *
 * A path that no longer exists is dropped: if the section shrank from four
 * clips to three, the fourth clip's upload has nowhere to go, and inventing a
 * slot for it would put a video back into a reel the site no longer shows.
 */
function restoreUploads(value: unknown, path: string, keep: Map<string, string>): unknown {
  const kept = keep.get(path);
  if (typeof value === 'string') return kept ?? value;
  if (Array.isArray(value)) {
    return value.map((v, i) => restoreUploads(v, path ? `${path}.${i}` : String(i), keep));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = restoreUploads(v, path ? `${path}.${k}` : k, keep);
    }
    return out;
  }
  return value;
}

/* --- run ------------------------------------------------------------------ */

/* Load the real format names before lifting anything, so .format-row blocks
   can be told apart from a hand-written list in the same shape. */
{
  const { data } = await db.from('formats').select('name, bracket_name');
  FORMAT_NAMES = (data ?? []).flatMap((f: Record<string, string>) =>
    [f.bracket_name, f.name].filter(Boolean)
  );
}

console.log(`\nPagina's uit ${SITE}\n`);

let failed = false;

/* The English pages are generated by the site's own i18n step and committed
   alongside the Dutch ones, so the translations already exist — lifting them is
   the same operation pointed at site/en. Doing anything else would mean asking
   someone to retype 900 strings that are already correct. */
const LOCALES: { code: 'nl' | 'en'; dir: string }[] = [
  { code: 'nl', dir: SITE },
  { code: 'en', dir: join(SITE, 'en') }
];

for (const [i, page] of PAGES.entries()) {
 for (const { code: locale, dir } of LOCALES) {
  const file = join(dir, page.file);
  if (!existsSync(file)) {
    if (locale === 'nl') console.warn(`  ! ${page.file} niet gevonden — overgeslagen`);
    continue;
  }

  const html = readFileSync(file, 'utf8');
  /* Sections are lifted from <main> AND from whatever sits between </main> and
     the footer. The newsletter band is outside <main> on six of these pages,
     and the partner marquee on the homepage is outside it too — reading only
     <main> silently dropped both. */
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  const main = mainMatch
    ? mainMatch[1] + html.slice(mainMatch.index! + mainMatch[0].length).split('<footer')[0]
    : html;
  const hero = extractHero(html);
  const extracted = extractSections(main);
  const lifted = page.id === 'home' ? withHomeCollections(extracted.sections) : extracted.sections;
  const sections = await keepSectionImages(page.id, locale, lifted);
  const skipped = extracted.skipped;

  const seo = {
    title: first(html, /<title>([\s\S]*?)<\/title>/),
    description: (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? ''
  };

  const { error } = await db.from('pages').upsert(
    {
      id: page.id,
      locale,
      nav_label: page.navLabel,
      sort_order: i,
      hero_label: hero.label,
      hero_title: hero.title,
      hero_intro: hero.intro,
      hero_image: await keepUploadedHero(page.id, locale, hero.image),
      hero_trust: hero.trust,
      hero_anchor_nav: hero.anchorNav,
      hero_overlay_meta: hero.overlayMeta,
      hero_cta_label: hero.ctaLabel,
      hero_cta_href: hero.ctaHref,
      hero_cta2_label: hero.cta2Label,
      hero_cta2_href: hero.cta2Href,
      hero_variant: page.heroVariant,
      seo,
      published: true
    },
    { onConflict: 'id,locale' }
  );
  if (error) {
    failed = true;
    console.error(`  ${page.id}/${locale} FOUT — ${error.message}`);
    continue;
  }

  await db.from('page_sections').delete().eq('page_id', page.id).eq('locale', locale);
  if (sections.length) {
    const { error: secErr } = await db.from('page_sections').insert(
      sections.map((s, position) => ({
        page_id: page.id,
        locale,
        position,
        type: s.type,
        ground: s.ground,
        anchor: s.anchor,
        content: s.content
      }))
    );
    if (secErr) {
      failed = true;
      console.error(`  ${page.id}/${locale} secties FOUT — ${secErr.message}`);
      continue;
    }
  }

  console.log(
    `  ${`${page.id} (${locale})`.padEnd(26)} ${String(sections.length).padStart(2)} secties` +
      (skipped.length ? `   (${skipped.length} niet herkend)` : '')
  );
  if (locale === 'nl') for (const s of skipped) console.log(`  ${' '.repeat(26)} · ${s}`);
 }
}


/* --- events and journal ---------------------------------------------------
 *
 * These two are not lifted from HTML like the others. Their layout is fixed —
 * the list of editions comes from the events content type, not from sections —
 * so what is configurable is the copy in the named slots around it, addressed
 * by anchor rather than by position.
 *
 * They are seeded in both languages, because the English strings for these
 * pages previously lived in lib/i18n.ts and belong with the rest of the page
 * copy now.
 */

interface ListPage {
  id: string;
  navLabel: string;
  sortOrder: number;
  locale: 'nl' | 'en';
  /** Shared copy read by a route, with no URL of its own. */
  isTemplate?: boolean;
  hero: { label: string; title: string; intro: string };
  seo: { title: string; description: string };
  slots: { anchor: string; type: string; content: Record<string, string> }[];
}

const LIST_PAGES: ListPage[] = [
  {
    id: 'events',
    navLabel: 'Events (lijstpagina)',
    sortOrder: 8,
    locale: 'nl',
    hero: {
      label: '[ Events ]',
      title: 'What can you experience?',
      intro:
        'Formats zijn de soorten experiences die IMPACT bouwt. Events zijn de concrete edities waarvoor je je kan inschrijven. Hieronder eerst wat eraan komt, daarna waarin we werken.'
    },
    seo: {
      title: 'Events | IMPACT',
      description: 'Camps, Days en Retreats. Elke editie heeft een eigen pagina.'
    },
    slots: [
      {
        anchor: 'upcoming',
        type: 'sec_head',
        content: {
          running: 'Upcoming IMPACT events',
          heading: 'Wat kan je binnenkort meemaken?',
          lead: 'Data en locaties worden bevestigd zodra de wachtlijst voldoende groot is. Inschrijven op de wachtlijst is gratis en verplicht je tot niets.'
        }
      },
      {
        anchor: 'note',
        type: 'rich_text',
        content: {
          running: '',
          heading: '',
          body: 'Deze events staan nog niet vast: of een editie doorgaat, hangt af van het aantal inschrijvingen op de wachtlijst.'
        }
      },
      {
        anchor: 'box-office',
        type: 'rich_text',
        content: {
          running: '',
          heading: '',
          body: 'Tickets en inschrijvingen lopen via ons box office. Daar staan alle edities met hun actuele status.'
        }
      },
      {
        anchor: 'formats',
        type: 'sec_head',
        content: {
          running: 'Onze formats',
          heading: 'Het medium verandert. De fundamenten blijven.',
          lead: 'Elk format vertrekt van dezelfde zes fundamenten. Wat verandert, is de duur, de intensiteit en de leeftijdsgroep.'
        }
      },
      {
        anchor: 'format-details',
        type: 'collection',
        content: {
          running: '',
          heading: '',
          lead: '',
          source: 'formats',
          limit: ''
        }
      },
      {
        anchor: 'alle',
        type: 'sec_head',
        content: {
          running: 'Alle events',
          heading: 'Volledig overzicht',
          lead: "Afgelopen edities blijven niet tussen de actieve events staan: ze verhuizen naar Journal als recap, met foto's, aftermovie en verhalen."
        }
      }
    ]
  },
  {
    id: 'events',
    navLabel: 'Events (list page)',
    sortOrder: 8,
    locale: 'en',
    hero: {
      label: '[ Events ]',
      title: 'What can you experience?',
      intro:
        'Formats are the kinds of experience IMPACT builds. Events are the concrete editions you can sign up for. Below: first what is coming, then what we work in.'
    },
    seo: {
      title: 'Events | IMPACT',
      description: 'Camps, Days and Retreats. Every edition has its own page.'
    },
    slots: [
      {
        anchor: 'upcoming',
        type: 'sec_head',
        content: {
          running: 'Upcoming IMPACT events',
          heading: 'What is coming up?',
          lead: 'Dates and locations are confirmed once the waiting list is large enough. Joining it is free and commits you to nothing.'
        }
      },
      {
        anchor: 'note',
        type: 'rich_text',
        content: {
          running: '',
          heading: '',
          body: 'These events are not fixed yet: whether an edition runs depends on how many people join the waiting list.'
        }
      },
      {
        anchor: 'box-office',
        type: 'rich_text',
        content: {
          running: '',
          heading: '',
          body: 'Tickets and registration run through our box office, with every edition and its current status.'
        }
      },
      {
        anchor: 'formats',
        type: 'sec_head',
        content: {
          running: 'Our formats',
          heading: 'The medium changes. The foundations stay.',
          lead: 'Every format starts from the same six foundations. What changes is duration, intensity and age group.'
        }
      },
      {
        anchor: 'format-details',
        type: 'collection',
        content: {
          running: '',
          heading: '',
          lead: '',
          source: 'formats',
          limit: ''
        }
      },
      {
        anchor: 'alle',
        type: 'sec_head',
        content: {
          running: 'All events',
          heading: 'Full overview',
          lead: 'Past editions do not stay among the active ones: they move to the Journal as a recap, with photos, aftermovie and stories.'
        }
      }
    ]
  },
  {
    id: 'journal',
    navLabel: 'Journal (lijstpagina)',
    sortOrder: 9,
    locale: 'nl',
    hero: {
      label: '[ Journal ]',
      title: 'What we lived, learned and built.',
      intro:
        'Journal is ons levende archief. Geen klassieke blog, maar alles wat er binnen IMPACT gebeurt of gebeurd is: recaps, verhalen, interviews, expert content, partnerverhalen en nieuws.'
    },
    seo: {
      title: 'Journal | IMPACT',
      description: 'Recaps, verhalen en inzichten van achter de schermen.'
    },
    slots: []
  },
  {
    id: 'journal',
    navLabel: 'Journal (list page)',
    sortOrder: 9,
    locale: 'en',
    hero: {
      label: '[ Journal ]',
      title: 'What we lived, learned and built.',
      intro:
        'The Journal is our living archive. Not a blog, but everything happening inside IMPACT: recaps, stories, interviews, expert content, partner stories and news.'
    },
    seo: {
      title: 'Journal | IMPACT',
      description: 'Recaps, stories and insights from behind the scenes.'
    },
    slots: []
  },
  {
    id: 'event-detail',
    navLabel: 'Eventpagina (sjabloon)',
    sortOrder: 10,
    locale: 'nl',
    isTemplate: true,
    hero: { label: '', title: 'Eventpagina', intro: '' },
    seo: { title: '', description: '' },
    slots: [
      { anchor: 'intro', type: 'sec_head', content: { running: 'Wat is het', heading: '', lead: '' } },
      { anchor: 'programme', type: 'sec_head', content: { running: 'Programma', heading: '', lead: '' } },
      { anchor: 'foundations', type: 'sec_head', content: { running: 'Welke fundamenten', heading: '', lead: '' } },
      {
        anchor: 'experts',
        type: 'sec_head',
        content: {
          running: 'Experts & coaches',
          heading: '',
          lead: 'Deze editie wordt begeleid door ons kernteam van experts, elk verbonden aan één of meerdere fundamenten.'
        }
      },
      { anchor: 'faq', type: 'sec_head', content: { running: 'Veelgestelde vragen', heading: '', lead: '' } },
      { anchor: 'practical', type: 'sec_head', content: { running: 'Praktisch', heading: '', lead: '' } },
      {
        anchor: 'waitlist',
        type: 'rich_text',
        content: {
          running: 'Wachtlijst',
          heading: 'Deze editie is nog niet bevestigd',
          body: 'Laat je gegevens achter en je hoort als eerste wanneer de inschrijvingen openen. Gratis en zonder verplichting.'
        }
      },
      {
        anchor: 'contact',
        type: 'band',
        content: {
          running: 'Contact',
          heading: 'Nog vragen over deze editie?',
          ctaLabel: 'Neem contact op',
          ctaHref: ''
        }
      },
      {
        anchor: 'news',
        type: 'news_band',
        content: {
          heading: 'Blijf op de hoogte',
          body: 'Nieuwe events, verhalen en partnerships. Eén mail per maand.'
        }
      }
    ]
  },
  {
    id: 'event-detail',
    navLabel: 'Event page (template)',
    sortOrder: 10,
    locale: 'en',
    isTemplate: true,
    hero: { label: '', title: 'Event page', intro: '' },
    seo: { title: '', description: '' },
    slots: [
      { anchor: 'intro', type: 'sec_head', content: { running: 'What it is', heading: '', lead: '' } },
      { anchor: 'programme', type: 'sec_head', content: { running: 'Programme', heading: '', lead: '' } },
      { anchor: 'foundations', type: 'sec_head', content: { running: 'Which foundations', heading: '', lead: '' } },
      {
        anchor: 'experts',
        type: 'sec_head',
        content: {
          running: 'Experts & coaches',
          heading: '',
          lead: 'This edition is guided by our core team of experts, each tied to one or more foundations.'
        }
      },
      { anchor: 'faq', type: 'sec_head', content: { running: 'Frequently asked questions', heading: '', lead: '' } },
      { anchor: 'practical', type: 'sec_head', content: { running: 'Practical', heading: '', lead: '' } },
      {
        anchor: 'waitlist',
        type: 'rich_text',
        content: {
          running: 'Waiting list',
          heading: 'This edition is not confirmed yet',
          body: 'Leave your details and you will be the first to hear when registration opens.'
        }
      },
      {
        anchor: 'contact',
        type: 'band',
        content: {
          running: 'Contact',
          heading: 'Questions about this edition?',
          ctaLabel: 'Get in touch',
          ctaHref: ''
        }
      },
      {
        anchor: 'news',
        type: 'news_band',
        content: {
          heading: 'Join the IMPACT community',
          body: 'New events, stories and partnerships. One mail a month.'
        }
      }
    ]
  }
];

for (const lp of LIST_PAGES) {
  const { error } = await db.from('pages').upsert(
    {
      id: lp.id,
      locale: lp.locale,
      nav_label: lp.navLabel,
      sort_order: lp.sortOrder,
      hero_label: lp.hero.label,
      hero_title: lp.hero.title,
      hero_intro: lp.hero.intro,
      hero_image: await keepUploadedHero(lp.id, lp.locale, null),
      hero_trust: [],
      hero_cta_label: '',
      hero_cta_href: '',
      hero_cta2_label: '',
      hero_cta2_href: '',
      hero_variant: 'page',
      seo: lp.seo,
      published: true,
      is_template: lp.isTemplate === true
    },
    { onConflict: 'id,locale' }
  );
  if (error) {
    failed = true;
    console.error(`  ${lp.id}/${lp.locale} FOUT — ${error.message}`);
    continue;
  }

  await db.from('page_sections').delete().eq('page_id', lp.id).eq('locale', lp.locale);
  if (lp.slots.length) {
    const { error: secErr } = await db.from('page_sections').insert(
      lp.slots.map((slot, position) => ({
        page_id: lp.id,
        locale: lp.locale,
        position,
        type: slot.type,
        ground: 'white',
        anchor: slot.anchor,
        content: slot.content
      }))
    );
    if (secErr) {
      failed = true;
      console.error(`  ${lp.id}/${lp.locale} secties FOUT — ${secErr.message}`);
      continue;
    }
  }
  console.log(
    `  ${`${lp.id} (${lp.locale})`.padEnd(20)} ${String(lp.slots.length).padStart(2)} tekstblokken`
  );
}

console.log(
  failed
    ? '\nKlaar, met fouten.\n'
    : '\nKlaar. Wat niet herkend is, staat nog als vaste opmaak op de statische site\n' +
        "en kan in de backoffice als sectie toegevoegd worden.\n"
);
process.exit(failed ? 1 : 0);
