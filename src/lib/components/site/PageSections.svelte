<script lang="ts">
  /**
   * Renders a configured page's sections.
   *
   * Each type maps onto markup the site's stylesheet already knows: .sec-head,
   * .two-col--media, .cta-cards, .band, .news-band. Nothing here invents a
   * layout — that is the whole reason the section types are typed rather than a
   * generic block list.
   */
  import { imageUrl } from '$lib/i18n';
  import Img from './Img.svelte';
  import { renderMarkdown } from '$lib/markdown';
  import type { PageSection } from '$lib/pages';
  import type { CollectionItem } from '$lib/server/page-content';

  let {
    sections,
    collections = {},
    nl = true
  }: {
    sections: PageSection[];
    collections?: Record<string, CollectionItem[]>;
    nl?: boolean;
  } = $props();

  const GROUND_CLASS: Record<string, string> = {
    sand: 'section section--sand',
    black: 'section section--black',
    red: 'section section--red'
  };
  const groundClass = (g: string) => GROUND_CLASS[g] ?? 'section';

  const str = (c: Record<string, unknown>, k: string) => String(c[k] ?? '').trim();

  /* The section title's own class. The site sizes a heading to its length and
     sometimes pushes it right, and those modifiers are part of looking the
     same — a 60px title dropped to the default size changes the rhythm of the
     whole section. */
  /* The row's call to action and its status read from the edition's status,
     the same words the events overview uses — a homepage that said something
     different about the same edition would be its own bug. */
  /** The journal chip, matching the words the journal page uses. */
  const CATEGORY: Record<string, [string, string]> = {
    'past-event': ['Voorbije editie', 'Past event'],
    story: ['Verhaal', 'Story'],
    insight: ['Inzicht', 'Insight'],
    social: ['Sociale impact', 'Social impact'],
    partner: ['Partner', 'Partner'],
    news: ['Nieuws', 'News']
  };
  const catLabel = (key: string) => {
    const pair = CATEGORY[key];
    return pair ? (nl ? pair[0] : pair[1]) : key;
  };

  const eventStatus = (s: string) =>
    s === 'open'
      ? nl ? 'Inschrijvingen open' : 'Registration open'
      : s === 'waitlist'
        ? nl ? 'Wachtlijst open' : 'Waiting list open'
        : s === 'past'
          ? nl ? 'Voorbije editie' : 'Past edition'
          : nl ? 'Binnenkort' : 'Coming soon';

  const eventCta = (s: string) =>
    s === 'open'
      ? nl ? 'Bekijk tickets' : 'View tickets'
      : s === 'waitlist'
        ? nl ? 'Zet me op de wachtlijst' : 'Join the waiting list'
        : nl ? 'Bekijk editie' : 'View edition';

  const headClass = (c: Record<string, unknown>) => {
    const mod = str(c, 'headingStyle');
    return mod ? `d-l ${mod}` : 'd-l';
  };
  const list = (c: Record<string, unknown>, k: string) =>
    Array.isArray(c[k]) ? (c[k] as Record<string, string>[]) : [];
  const tags = (c: Record<string, unknown>, k: string) =>
    Array.isArray(c[k]) ? (c[k] as string[]) : [];

  /* Each content type has a natural look on this site — partners are a logo
     wall, events are rows, foundations a grid — so the editor only has to
     choose when it wants something other than the obvious. */
  const DEFAULTS: Record<string, string> = {
    partners: 'logos',
    figures: 'stats',
    events: 'event_rows',
    journal: 'journal_cards',
    formats: 'format_rows',
    age_groups: 'age_cards',
    experts: 'expert_grid'
  };
  const how = (c: Record<string, unknown>) =>
    str(c, 'presentation') || DEFAULTS[str(c, 'source')] || 'cards';
</script>

{#each sections as s (s.id || s.position)}
  {@const c = s.content}

  {#if s.type === 'sec_head'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        <div class="sec-head" data-reveal>
          <div>
            {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
            {#if str(c, 'heading')}<h2 class={headClass(c)}>{str(c, 'heading')}</h2>{/if}
          </div>
          {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
          {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
            <p><a href={str(c, 'ctaHref')} class="tlink">{str(c, 'ctaLabel')}</a></p>
          {/if}
        </div>
        {#if str(c, 'note')}<p class="body note">{str(c, 'note')}</p>{/if}
      </div>
    </section>

  {:else if s.type === 'rich_text'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap" style="max-width:860px">
        {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
        {#if str(c, 'heading')}
          <h2 class={headClass(c)} style="margin:18px 0 20px">{str(c, 'heading')}</h2>
        {/if}
        <!-- Escaped before any tags are re-introduced; see lib/markdown.ts. -->
        <div class="prose">{@html renderMarkdown(str(c, 'body'))}</div>
      </div>
    </section>

  {:else if s.type === 'media_text'}
    {@const left = str(c, 'imageSide') === 'left'}
    {@const hasImage = !!str(c, 'image')}
    <!-- Two shapes share this section. `two-col--media` sizes the picture as a
         direct child, which is why the modifier and the extra wrapping div are
         mutually exclusive: adding the modifier to the plain layout makes the
         stylesheet target a div that holds the picture rather than the picture
         itself, and the image loses its sizing. -->
    {@const media = str(c, 'layout') !== 'plain'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap two-col" class:two-col--media={hasImage && media}>
        {#if left && str(c, 'image')}
          {#if media}
            <Img src={str(c, 'image')} alt={str(c, 'heading')} role="wide" style="width:100%;aspect-ratio:16/9;object-fit:cover" />
          {:else}
            <div><Img src={str(c, 'image')} alt={str(c, 'heading')} role="wide" /></div>
          {/if}
        {/if}
        <div>
          {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
          {#if str(c, 'kicker')}
            {@const parts = str(c, 'kicker').split('|')}
            <div class="d-m" style="margin:22px 0 26px">
              {parts[0].trim()}
              {#if parts[1]}<span class="red">{parts[1].trim()}</span>{/if}
            </div>
          {/if}
          {#if str(c, 'heading')}
            <h2 class={headClass(c)} style="margin:22px 0 24px">{str(c, 'heading')}</h2>
          {/if}
          {#if str(c, 'intro')}<p class="intro">{str(c, 'intro')}</p>{/if}
          {#if tags(c, 'ticks').length}
            <ul class="ticks">
              {#each tags(c, 'ticks') as tick (tick)}<li>{tick}</li>{/each}
            </ul>
          {/if}
          {#if str(c, 'body')}<p class="body" style="margin-top:24px">{str(c, 'body')}</p>{/if}
          {#if (str(c, 'ctaLabel') && str(c, 'ctaHref')) || (str(c, 'cta2Label') && str(c, 'cta2Href'))}
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px">
              {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
                <a href={str(c, 'ctaHref')} class="pill pill--primary">{str(c, 'ctaLabel')}</a>
              {/if}
              {#if str(c, 'cta2Label') && str(c, 'cta2Href')}
                <a href={str(c, 'cta2Href')} class="pill pill--secondary">{str(c, 'cta2Label')}</a>
              {/if}
            </div>
          {/if}
        </div>
        {#if !left && str(c, 'image')}
          {#if media}
            <Img src={str(c, 'image')} alt={str(c, 'heading')} role="wide" style="width:100%;aspect-ratio:16/9;object-fit:cover" />
          {:else}
            <div><Img src={str(c, 'image')} alt={str(c, 'heading')} role="wide" /></div>
          {/if}
        {/if}
      </div>
    </section>

  {:else if s.type === 'collection' && how(c) === 'marquee'}
    {@const items = collections[`${s.position}`] ?? []}
    <!-- Deliberately not inside a <section>. The band carries its own padding
         and its own top and bottom border, and a section wrapper would add a
         full section's padding above and below it — which is not how the site
         seats it under the newsletter block. -->
      <!-- The scrolling partner band. The track holds the same set twice:
           the animation translates by exactly one set's width and resets,
           so the second copy is what keeps the belt from showing a gap.
           That copy is aria-hidden and its slots are spans rather than
           links — a screen reader and the tab order should meet each
           partner once, not twice. -->
      <div class="marquee marquee--sand">
        {#if str(c, 'running') || str(c, 'note')}
          <div class="mq-head">
            {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
            {#if str(c, 'note')}<span class="mq-note">{str(c, 'note')}</span>{/if}
          </div>
        {/if}
        <div class="mq-track">
          <div class="mq-set">
            {#each items as it (it.id)}
              <div class="cell">
                {#if it.href}
                  <a class="slot" href={it.href} target="_blank" rel="noopener" title={it.title}>
                    <img src={imageUrl(it.image ?? '')} alt={it.title} loading="lazy" />
                  </a>
                {:else}
                  <span class="slot">
                    <img src={imageUrl(it.image ?? '')} alt={it.title} loading="lazy" />
                  </span>
                {/if}
              </div>
            {/each}
          </div>
          <div class="mq-set" aria-hidden="true">
            {#each items as it (it.id)}
              <div class="cell">
                <span class="slot">
                  <img src={imageUrl(it.image ?? '')} alt="" loading="lazy" />
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>

  {:else if s.type === 'collection' && how(c) === 'strip'}
    {@const items = collections[`${s.position}`] ?? []}
    <!-- The strip is a direct child of the section, not of .wrap: it scrolls
         full-bleed past the container, which is the point of the layout. Head,
         two-paragraph intro and progress foot each get their own .wrap around
         it, exactly as site/index.html does. -->
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        <div class="sec-head" data-reveal>
          {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
          <div>
            {#if str(c, 'heading')}<h2 class={headClass(c)}>{str(c, 'heading')}</h2>{/if}
          </div>
          <div class="strip-nav">
            <button class="strip-btn" type="button" data-strip-prev aria-label={nl ? 'Vorige' : 'Previous'}>←</button>
            <button class="strip-btn" type="button" data-strip-next aria-label={nl ? 'Volgende' : 'Next'}>→</button>
          </div>
        </div>

        {#if str(c, 'lead') || str(c, 'lead2')}
          <div class="measure-2 strip-intro">
            {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
            {#if str(c, 'lead2')}<p class="body">{str(c, 'lead2')}</p>{/if}
          </div>
        {/if}
      </div>

      <div class="strip fund-track" role="region" aria-label={str(c, 'heading')}>
        {#each items as it (it.id)}
          <article class="strip-card">
            <div class="strip-img">
              {#if it.image}<Img src={it.image} alt={it.title} role="card" loading="lazy" />{/if}
              <span class="chip">[{it.number ?? ''}] {it.title}</span>
            </div>
            {#if it.bodyLong || it.body}<p class="body">{it.bodyLong || it.body}</p>{/if}
          </article>
        {/each}
      </div>

      <div class="wrap">
        <div class="fund-foot">
          <!-- main.js fills the bar and the counter through data-progress and
               data-counter as the strip scrolls. -->
          <div class="progress">
            <div class="track"><span data-progress></span></div>
            <span class="counter" data-counter>01 / {String(items.length).padStart(2, '0')}</span>
          </div>
          {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
            <a href={str(c, 'ctaHref')} class="tlink">{str(c, 'ctaLabel')}</a>
          {/if}
        </div>
      </div>
    </section>

  {:else if s.type === 'collection'}
    {@const items = collections[`${s.position}`] ?? []}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        {#if str(c, 'running') || str(c, 'heading')}
          <div class="sec-head" data-reveal>
            <div>
              {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
              {#if str(c, 'heading')}<h2 class={headClass(c)}>{str(c, 'heading')}</h2>{/if}
            </div>
            {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
            {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
              <p><a href={str(c, 'ctaHref')} class="tlink">{str(c, 'ctaLabel')}</a></p>
            {/if}
          </div>
        {/if}

        {#if items.length === 0}
          <p class="note body">{nl ? 'Nog niets om te tonen.' : 'Nothing to show yet.'}</p>
        {:else if how(c) === 'logos'}
          <div class="logos" style="margin-top:26px">
            {#each items as it (it.id)}
              {#if it.image}
                <a href={it.href || '#'} target="_blank" rel="noopener">
                  <Img src={it.image} alt={it.title} role="portrait" loading="lazy" />
                </a>
              {/if}
            {/each}
          </div>
        {:else if how(c) === 'stats'}
          <div class="stats" style="margin-top:26px">
            {#each items as it (it.id)}
              <div class="stat">
                <div class="n">{it.title}</div>
                <div class="k">{it.subtitle}</div>
                {#if it.body}<p class="body">{it.body}</p>{/if}
              </div>
            {/each}
          </div>
        {:else if how(c) === 'event_rows'}
          <!-- The same row the events overview renders: the link covers the
               editie, and the call to action sits OUTSIDE it, because a link
               inside a link is not a thing a browser will build. -->
          {#each items as it (it.id)}
            {@const m = it.meta ?? {}}
            <div class="event-row">
              <a class="event-row-main" href={it.href}>
                {#if it.image}<Img src={it.image} alt={it.alt || it.title} role="card" />{/if}
                <div>
                  {#if m.formatName}<span class="tag">{m.formatName}</span>{/if}
                  {#if m.price}<span class="tag tag--dim">{m.price}</span>{/if}
                  <h3>{it.title}</h3>
                </div>
                <div class="when meta"><strong>{m.dateText ?? ''}</strong>{m.location ?? ''}</div>
                {#if m.ageMin != null && m.ageMax != null}
                  <div class="age meta">{m.ageMin}–{m.ageMax} {nl ? 'jaar' : 'years'}</div>
                {/if}
              </a>
              <div class="cta">
                <a class="pill pill--secondary pill--sm" href={`${it.href}#wachtlijst`}>
                  {eventCta(m.status ?? '')}
                </a>
                <span class="status">{eventStatus(m.status ?? '')}</span>
              </div>
            </div>
          {/each}
        {:else if how(c) === 'journal_cards'}
          <div class="cards-4" style="margin-top:26px">
            {#each items as it (it.id)}
              <a class="jcard" href={it.href}>
                {#if it.image}
                  <Img src={it.image} alt={it.alt || ''} role="card" loading="lazy" />
                {/if}
                {#if it.meta?.category}<span class="tag">{catLabel(it.meta.category)}</span>{/if}
                <h3>{it.title}</h3>
                {#if it.subtitle}<p class="meta">{it.subtitle}</p>{/if}
              </a>
            {/each}
          </div>
        {:else if how(c) === 'format_rows'}
          {#each items as it, i (it.id)}
            {@const hosted = Boolean(it.meta?.isHosted)}
            <a
              class="format-row"
              class:format-row--hosted={hosted}
              href={hosted ? '/hosted-experiences' : `#${it.id}`}
            >
              <!-- The hosted format has no number of its own on the site: it is
                   not one of the numbered formats but the way any of them can
                   be built with an external partner. -->
              <span class="n">{hosted ? '—' : String(i + 1).padStart(2, '0')}</span>
              <span class="name">IMPACT <span class="red">[{it.title}]</span></span>
              <p class="body desc">{it.body ?? ''}</p>
              <span class="m">{it.subtitle ?? ''}</span>
            </a>
          {/each}
        {:else if how(c) === 'age_cards'}
          <!-- The site's who-card: the age range and the tagline are their own
               blocks with their own type, not a heading and a tag, and the
               formats each group feeds sit underneath as plain spans. -->
          <div class="cards-3">
            {#each items as it (it.id)}
              <article class="who-card">
                {#if it.image}
                  <Img src={it.image} alt={it.alt || it.title} role="card" loading="lazy" />
                {/if}
                <div class="inner">
                  <div class="age">{it.title}</div>
                  {#if it.subtitle}<div class="tagline">{it.subtitle}</div>{/if}
                  {#if it.body}<p class="body">{it.body}</p>{/if}
                  {#if it.tags?.length}
                    <div class="tags">
                      {#each it.tags as tag (tag)}<span>{tag}</span>{/each}
                    </div>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {:else if how(c) === 'expert_grid'}
          <!-- Unconfirmed experts never arrive here: the anon policy filters
               them before this component sees a row. -->
          <div class="expert-grid" style="margin-top:26px">
            {#each items as it (it.id)}
              <article class="expert">
                <h4>{it.title}</h4>
                {#if it.subtitle}<p class="org">{it.subtitle}</p>{/if}
                {#if it.body}<p class="r">{it.body}</p>{/if}
              </article>
            {/each}
          </div>
        {:else if how(c) === 'fund_long'}
          {#each items as it (it.id)}
            <div class="fund-long">
              {#if it.image}
                <Img class="fund-long-img" src={it.image} alt={it.title} role="wide" loading="lazy" />
              {/if}
              <div>
                <span class="num">{it.number ?? ''}</span>
                <h3 class="d-m">{it.title}</h3>
                {#if it.body}<p class="intro">{it.body}</p>{/if}
              </div>
            </div>
          {/each}
        {:else}
          <div class="fund-grid" style="margin-top:26px">
            {#each items as it (it.id)}
              <div class="fund-cell">
                {#if it.number}<div class="n">{it.number}</div>{/if}
                <h3>{it.title}</h3>
                {#if it.subtitle}<span class="tag tag--dim">{it.subtitle}</span>{/if}
                {#if it.body}<p class="body">{it.body}</p>{/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if str(c, 'note')}
          <p class="body note">{str(c, 'note')}</p>
        {/if}
      </div>
    </section>

  {:else if s.type === 'cta_cards'}
    <section class="cta-cards" id={s.anchor || undefined}>
      {#each list(c, 'cards') as card (card.title)}
        {@const variant = (card.variant || 'ink').trim()}
        <div class="cta-card cta-card--{variant}">
          <h3>{card.title}</h3>
          {#if card.text}<p>{card.text}</p>{/if}
          {#if card.ctaLabel && card.ctaHref}
            <a class="pill pill--ghost" href={card.ctaHref}>{card.ctaLabel}</a>
          {/if}
        </div>
      {/each}
    </section>

  {:else if s.type === 'band'}
    <section class="band" id={s.anchor || undefined}>
      <div class="wrap">
        <div>
          {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
          {#if str(c, 'heading')}<h2 class="d-l d-l--44">{str(c, 'heading')}</h2>{/if}
        </div>
        {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
          <a class="pill pill--ghost" href={str(c, 'ctaHref')}>{str(c, 'ctaLabel')}</a>
        {/if}
      </div>
    </section>

  {:else if s.type === 'downloads'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
        {#if str(c, 'heading')}
          <h2 class={headClass(c)} style="margin:22px 0 34px">{str(c, 'heading')}</h2>
        {/if}
        <div class="dl-list">
          {#each list(c, 'items') as item, i (item.title)}
            {@const n = String(i + 1).padStart(2, '0')}
            {#if item.href}
              <a class="dl-row" href={item.href} target="_blank" rel="noopener">
                <span class="n">{n}</span><span class="t">{item.title}</span>
                <span class="m">{item.meta || 'PDF'}</span>
              </a>
            {:else}
              <!-- No link yet: the site shows these greyed rather than hiding
                   them, so the list reads as a plan rather than a gap. -->
              <div class="dl-row is-pending">
                <span class="n">{n}</span><span class="t">{item.title}</span>
                <span class="m">{item.meta || (nl ? 'Volgt' : 'Coming')}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </section>

  {:else if s.type === 'split_list'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
        <div class="split-list" style="margin-top:34px">
          <div>
            <h3 class="h">{str(c, 'leftTitle')}</h3>
            <ul class="ticks">
              {#each tags(c, 'leftItems') as item (item)}<li>{item}</li>{/each}
            </ul>
          </div>
          <div>
            <h3 class="h">{str(c, 'rightTitle')}</h3>
            <ul class="ticks">
              {#each tags(c, 'rightItems') as item (item)}<li>{item}</li>{/each}
            </ul>
          </div>
        </div>
      </div>
    </section>

  {:else if s.type === 'numbered_list'}
    {@const routes = str(c, 'style') !== 'layers'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap">
        {#if str(c, 'running') || str(c, 'heading')}
          <div class="sec-head" data-reveal>
            <div>
              {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
              {#if str(c, 'heading')}<h2 class={headClass(c)}>{str(c, 'heading')}</h2>{/if}
            </div>
            {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
          </div>
        {/if}
        <div class={routes ? 'routes' : 'layers'}>
          {#each list(c, 'items') as item, i (item.title)}
            {@const n = String(i + 1).padStart(2, '0')}
            {#if routes && item.ctaHref}
              <a class="route" href={item.ctaHref}>
                <span class="n">{n}</span>
                <h3>{item.title}</h3>
                {#if item.body}<p class="body">{item.body}</p>{/if}
                {#if item.ctaLabel}<span class="tlink">{item.ctaLabel}</span>{/if}
              </a>
            {:else}
              <div class={routes ? 'route' : 'layer'}>
                <span class="n">{n}</span>
                <h3>{item.title}</h3>
                {#if item.body}<p class="body">{item.body}</p>{/if}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </section>

  {:else if s.type === 'reel'}
    {@const consented = str(c, 'consentOnFile') === 'ja'}
    <section class="reel-sec" id={s.anchor || undefined}>
      <div class="reel">
        <div class="wrap">
          <div class="reel-head" data-reveal>
            {#if str(c, 'word')}
              <p class="reel-word" aria-hidden="true">{str(c, 'word')}</p>
            {/if}
            {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
            {#if str(c, 'heading')}<h2 class={headClass(c)}>{str(c, 'heading')}</h2>{/if}
            {#if str(c, 'body')}<p class="body">{str(c, 'body')}</p>{/if}
          </div>
        </div>
      </div>

      {#if consented && list(c, 'clips').length}
        {@const clips = list(c, 'clips')}
        {@const total = String(clips.length).padStart(2, '0')}
        <!-- Rendered only against a recorded consent. These clips show
             minors; 01-BRIEF.md is explicit that they come down if the
             written permission never arrives.

             cinema.js pins this block and drives it from scroll position. It
             reaches for .shot-dim, .glass, [data-sound] and the four hud
             hooks by name, so this is the static site's markup element for
             element — a missing .shot-dim is not a cosmetic difference, it is
             a clip that never brightens when it becomes the active one. -->
        <div class="cinema" data-cinema>
          <div class="cinema-viewport">
            <div class="cinema-track" data-cinema-track>
              {#each clips as clip, i (clip.mp4 || clip.webm || i)}
                <figure class="shot" data-shot>
                  <video
                    controls
                    preload="none"
                    playsinline
                    muted
                    loop
                    poster={clip.poster ? imageUrl(clip.poster) : undefined}
                    aria-label={clip.alt || clip.title || undefined}
                  >
                    {#if clip.webm}<source src={imageUrl(clip.webm)} type="video/webm" />{/if}
                    {#if clip.mp4}<source src={imageUrl(clip.mp4)} type="video/mp4" />{/if}
                    {nl ? 'Je browser kan deze video niet spelen.' : 'Your browser cannot play this video.'}
                  </video>
                  <span class="shot-dim" aria-hidden="true"></span>
                  <button class="shot-sound" type="button" data-sound aria-pressed="false">
                    <span class="on">{nl ? 'Geluid aan' : 'Sound on'}</span><span class="off"
                      >{nl ? 'Geluid uit' : 'Sound off'}</span
                    >
                  </button>
                  {#if clip.title || clip.meta}
                    <figcaption class="glass">
                      <span class="glass-n">{String(i + 1).padStart(2, '0')} / {total}</span>
                      {#if clip.title}<b>{clip.title}</b>{/if}
                      {#if clip.meta}<span class="glass-m">{clip.meta}</span>{/if}
                    </figcaption>
                  {/if}
                </figure>
              {/each}
            </div>
          </div>
          <div class="cinema-hud">
            <button type="button" data-cinema-prev aria-label={nl ? 'Vorige clip' : 'Previous clip'}
              >&lsaquo;</button
            >
            <span class="cinema-progress" aria-hidden="true"><i data-cinema-bar></i></span>
            <span class="cinema-count" aria-hidden="true"><b data-cinema-n>01</b> / {total}</span>
            <button type="button" data-cinema-next aria-label={nl ? 'Volgende clip' : 'Next clip'}
              >&rsaquo;</button
            >
          </div>
        </div>

        {#if str(c, 'note')}
          <div class="reel-tail">
            <p class="reel-note">{str(c, 'note')}</p>
          </div>
        {/if}
      {/if}
    </section>

  {:else if s.type === 'news_band'}
    {@const twoCol = str(c, 'style') === 'two_col'}
    <!-- Two layouts for one form: the narrow band most pages end on, and the
         two-column block the homepage and Hosted Experiences use, where the
         copy sits beside the field rather than above it. -->
    <section class={twoCol ? 'section' : 'news-band'} id={s.anchor || undefined}>
      <div class="wrap" class:two-col={twoCol} class:two-col--form={twoCol}>
        {#if twoCol}
          <div>
            {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
            <h2 class={headClass(c)} style="margin:22px 0 22px">
              {str(c, 'heading') || (nl ? 'Blijf op de hoogte' : 'Stay in the loop')}
            </h2>
            {#if str(c, 'body')}
              <p class="body" style="max-width:460px">{str(c, 'body')}</p>
            {/if}
          </div>
        {:else}
          <h2
            class={str(c, 'headingStyle') ? headClass(c) : 'd-l d-l--40'}
            style="margin:16px 0 12px"
          >
            {str(c, 'heading') || (nl ? 'Blijf op de hoogte' : 'Stay in the loop')}
          </h2>
          {#if str(c, 'body')}<p class="body">{str(c, 'body')}</p>{/if}
        {/if}
        <form
          class={twoCol ? undefined : 'news-form'}
          id={twoCol ? 'newsletter-form' : undefined}
          data-newsletter
          novalidate
          name="newsletter"
          action="/"
          data-netlify="true"
          {...{ 'netlify-honeypot': 'bot-field' }}
        >
          <input type="hidden" name="form-name" value="newsletter" />
          <input type="hidden" name="bot-field" />
          <div class="field-row">
            {#if !twoCol}
              <label class="sr-only" for="ps-news-{s.position}">E-mail</label>
            {/if}
            <input
              id="ps-news-{s.position}"
              name="email"
              type="email"
              placeholder={nl ? 'jouw e-mailadres' : 'your email address'}
              aria-label={twoCol ? (nl ? 'Jouw e-mailadres' : 'Your email address') : undefined}
              required
            />
            <button type="submit" class={twoCol ? 'pill pill--primary' : 'pill pill--primary pill--sm'}>
              {nl ? 'Inschrijven' : 'Subscribe'}
            </button>
          </div>
          <p class="form-msg" role="status"></p>
          {#if twoCol}
            <p class="meta">
              {nl
                ? 'Eén mail per maand, geen spam. Uitschrijven kan altijd. Zie onze '
                : 'One mail a month, no spam. Unsubscribe any time. See our '}<a
                href={nl ? '/privacy' : '/en/privacy'}>{nl ? 'privacyverklaring' : 'privacy notice'}</a
              >.
            </p>
          {/if}
        </form>
      </div>
    </section>
  {/if}
{/each}

<style>
  .prose :global(p) {
    font-size: 16.5px;
    line-height: 1.75;
    color: var(--grey-body);
    margin-bottom: 20px;
  }
  .prose :global(h2),
  .prose :global(h3) {
    font-weight: 800;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin: 32px 0 12px;
  }
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 20px 22px;
    color: var(--grey-body);
    line-height: 1.75;
  }
  .prose :global(ul) {
    list-style: disc;
  }
  .prose :global(ol) {
    list-style: decimal;
  }
  .prose :global(a) {
    color: var(--red);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
