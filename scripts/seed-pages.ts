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
    cta2Href: buttons[1] ? localise(buttons[1][1]) : ''
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

    if (attrs.includes('news-band')) {
      sections.push({
        type: 'news_band',
        ground: 'white',
        anchor,
        content: {
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          body: first(inner, /<p class="body">([\s\S]*?)<\/p>/)
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
          ctaLabel: first(inner, /<a class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/),
          ctaHref: (inner.match(/<a class="pill[^"]*"[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
        }
      });
      continue;
    }

    /* The numbered blocks appear twice on the site with different styling:
       .routes on the homepage and .layers on Over. One section type, one
       switch, rather than two types that would drift apart. */
    if (inner.includes('class="routes"') || inner.includes('class="layers"')) {
      const routes = inner.includes('class="routes"');
      const cls = routes ? 'route' : 'layer';
      const re2 = new RegExp(
        `<(?:a|div)[^>]*class="${cls}"[^>]*>([\\s\\S]*?)<\\/(?:a|div)>`,
        'g'
      );
      const items = [...inner.matchAll(re2)].map((row) => ({
        title: first(row[1], /<h3[^>]*>([\s\S]*?)<\/h3>/),
        body: first(row[1], /<p class="body">([\s\S]*?)<\/p>/),
        ctaLabel: first(row[1], /<span class="tlink">([\s\S]*?)<\/span>/),
        ctaHref: (row[0].match(/<a[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
      }));
      if (items.length) {
        sections.push({
          type: 'numbered_list',
          ground,
          anchor,
          content: {
            running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
            heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
            style: routes ? 'routes' : 'layers',
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
      ['format-row', 'formats', 'format_rows']
    ];
    const match = asCollection.find(([needle]) => inner.includes(needle));
    if (match) {
      sections.push({
        type: 'collection',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          lead: first(inner, /<p class="body">([\s\S]*?)<\/p>/),
          source: match[1],
          presentation: match[2],
          limit: ''
        }
      });
      continue;
    }

    if (inner.includes('data-cinema') || inner.includes('reel-head')) {
      const clips = [...inner.matchAll(/<figure class="shot"[\s\S]*?<\/figure>/g)].map((sh) => ({
        webm: (sh[0].match(/src="([^"]+\.webm)"/) ?? [])[1] ?? '',
        mp4: (sh[0].match(/src="([^"]+\.mp4)"/) ?? [])[1] ?? '',
        poster: (sh[0].match(/poster="([^"]+)"/) ?? [])[1] ?? '',
        caption: first(sh[0], /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)
      }));
      sections.push({
        type: 'reel',
        ground,
        anchor,
        content: {
          running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
          heading: first(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/),
          body: first(inner, /<p class="body">([\s\S]*?)<\/p>/),
          word: first(inner, /<p class="reel-word"[^>]*>([\s\S]*?)<\/p>/),
          clips,
          // Never seeded on. The consent for these clips is not held, and the
          // seed is not the place to assert that it is.
          consentOnFile: ''
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
      if (kickerRaw && heading) {
        const red = first(kickerRaw[1], /<span class="red">([\s\S]*?)<\/span>/);
        const plain = decode(kickerRaw[1].replace(/<span class="red">[\s\S]*?<\/span>/, ''));
        const btns = [...inner.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
        sections.push({
          type: 'media_text',
          ground,
          anchor,
          content: {
            running: first(inner, /<span class="running">([\s\S]*?)<\/span>/),
            kicker: red ? `${plain} | ${red}` : plain,
            heading,
            intro: '',
            body: first(inner, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
            ticks: [],
            image: '',
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
          intro: first(inner, /<p class="intro">([\s\S]*?)<\/p>/),
          body: first(inner, /<p class="body"[^>]*>([\s\S]*?)<\/p>/),
          ticks,
          image: imgSrc,
          imageSide: imageFirst ? 'left' : 'right',
          ctaLabel: first(inner, /<a href="[^"]*" class="pill[^"]*"[^>]*>([\s\S]*?)<\/a>/),
          ctaHref: (inner.match(/<a href="([^"]+)" class="pill/) ?? [])[1] ?? ''
        }
      });
      continue;
    }

    if (inner.includes('sec-head')) {
      const head = inner.match(/<div class="sec-head"[\s\S]*?<\/div>\s*<\/div>|<div class="sec-head"[\s\S]*?<\/div>/);
      const block = head ? head[0] : inner;
      const heading = first(block, /<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (heading) {
        sections.push({
          type: 'sec_head',
          ground,
          anchor,
          content: {
            running: first(block, /<span class="running">([\s\S]*?)<\/span>/),
            heading,
            lead: first(block, /<p class="body">([\s\S]*?)<\/p>/)
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
function withHomeCollections(sections: Section[]): Section[] {
  const after: Record<string, { source: string; limit: string }> = {
    fundamenten: { source: 'foundations', limit: '' },
    events: { source: 'events', limit: '3' },
    'journal-teaser': { source: 'journal', limit: '4' }
  };

  const out: Section[] = [];
  for (const section of sections) {
    out.push(section);
    const want = section.anchor ? after[section.anchor] : undefined;
    // The block may already have been lifted as a collection — the foundations
    // strip is one — in which case adding another would render it twice.
    if (!want || section.type === 'collection') continue;
    out.push({
      type: 'collection',
      ground: section.ground === 'sand' ? 'sand' : 'white',
      anchor: `${section.anchor}-lijst`,
      content: { running: '', heading: '', lead: '', ...want }
    });
  }
  return out;
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

  const managed = new Map<string, string>();
  for (const row of (data ?? []) as Record<string, any>[]) {
    const image = String(row.content?.image ?? '');
    if (image.startsWith('/uploads/')) managed.set(row.anchor || `#${row.position}`, image);
  }
  if (managed.size === 0) return next;

  return next.map((section, i) => {
    const keep = managed.get(section.anchor || `#${i}`);
    if (!keep || !section.content.image) return section;
    return { ...section, content: { ...section.content, image: keep } };
  });
}

/* --- run ------------------------------------------------------------------ */

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
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ?? [, html])[1] ?? html;
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
