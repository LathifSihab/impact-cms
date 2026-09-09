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
  return {
    label: first(block, /<span class="label[^"]*">([\s\S]*?)<\/span>/),
    title: first(block, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    intro: first(block, /<p class="intro[^"]*">([\s\S]*?)<\/p>/),
    image: (block.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? null
  };
}

function groundOf(openTag: string): string {
  if (openTag.includes('section--black')) return 'black';
  if (openTag.includes('section--sand')) return 'sand';
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

/* --- run ------------------------------------------------------------------ */

console.log(`\nPagina's uit ${SITE}\n`);

let failed = false;

for (const [i, page] of PAGES.entries()) {
  const file = join(SITE, page.file);
  if (!existsSync(file)) {
    console.warn(`  ! ${page.file} niet gevonden — overgeslagen`);
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ?? [, html])[1] ?? html;
  const hero = extractHero(html);
  const { sections, skipped } = extractSections(main);

  const seo = {
    title: first(html, /<title>([\s\S]*?)<\/title>/),
    description: (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? ''
  };

  const { error } = await db.from('pages').upsert(
    {
      id: page.id,
      locale: 'nl',
      nav_label: page.navLabel,
      sort_order: i,
      hero_label: hero.label,
      hero_title: hero.title,
      hero_intro: hero.intro,
      hero_image: hero.image,
      hero_variant: page.heroVariant,
      seo,
      published: true
    },
    { onConflict: 'id' }
  );
  if (error) {
    failed = true;
    console.error(`  ${page.id.padEnd(20)} FOUT — ${error.message}`);
    continue;
  }

  await db.from('page_sections').delete().eq('page_id', page.id);
  if (sections.length) {
    const { error: secErr } = await db.from('page_sections').insert(
      sections.map((s, position) => ({
        page_id: page.id,
        position,
        type: s.type,
        ground: s.ground,
        anchor: s.anchor,
        content: s.content
      }))
    );
    if (secErr) {
      failed = true;
      console.error(`  ${page.id.padEnd(20)} secties FOUT — ${secErr.message}`);
      continue;
    }
  }

  console.log(
    `  ${page.id.padEnd(20)} ${String(sections.length).padStart(2)} secties` +
      (skipped.length ? `   (${skipped.length} niet herkend)` : '')
  );
  for (const s of skipped) console.log(`  ${' '.repeat(20)} · ${s}`);
}

console.log(
  failed
    ? '\nKlaar, met fouten.\n'
    : '\nKlaar. Wat niet herkend is, staat nog als vaste opmaak op de statische site\n' +
        "en kan in de backoffice als sectie toegevoegd worden.\n"
);
process.exit(failed ? 1 : 0);
