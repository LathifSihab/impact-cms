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

  const groundClass = (g: string) =>
    g === 'sand' ? 'section section--sand' : g === 'black' ? 'section section--black' : 'section';

  const str = (c: Record<string, unknown>, k: string) => String(c[k] ?? '').trim();
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
            {#if str(c, 'heading')}<h2 class="d-l">{str(c, 'heading')}</h2>{/if}
          </div>
          {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
        </div>
      </div>
    </section>

  {:else if s.type === 'rich_text'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap" style="max-width:860px">
        {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
        {#if str(c, 'heading')}
          <h2 class="d-l" style="margin:18px 0 20px">{str(c, 'heading')}</h2>
        {/if}
        <!-- Escaped before any tags are re-introduced; see lib/markdown.ts. -->
        <div class="prose">{@html renderMarkdown(str(c, 'body'))}</div>
      </div>
    </section>

  {:else if s.type === 'media_text'}
    {@const left = str(c, 'imageSide') === 'left'}
    <section class={groundClass(s.ground)} id={s.anchor || undefined}>
      <div class="wrap two-col two-col--media">
        {#if left && str(c, 'image')}
          <img src={imageUrl(str(c, 'image'))} alt={str(c, 'heading')} style="width:100%;aspect-ratio:16/9;object-fit:cover" />
        {/if}
        <div>
          {#if str(c, 'running')}<span class="running">{str(c, 'running')}</span>{/if}
          {#if str(c, 'heading')}
            <h2 class="d-l" style="margin:22px 0 24px">{str(c, 'heading')}</h2>
          {/if}
          {#if str(c, 'intro')}<p class="intro">{str(c, 'intro')}</p>{/if}
          {#if tags(c, 'ticks').length}
            <ul class="ticks">
              {#each tags(c, 'ticks') as tick (tick)}<li>{tick}</li>{/each}
            </ul>
          {/if}
          {#if str(c, 'body')}<p class="body" style="margin-top:24px">{str(c, 'body')}</p>{/if}
          {#if str(c, 'ctaLabel') && str(c, 'ctaHref')}
            <a href={str(c, 'ctaHref')} class="pill pill--primary" style="margin-top:26px">
              {str(c, 'ctaLabel')}
            </a>
          {/if}
        </div>
        {#if !left && str(c, 'image')}
          <img src={imageUrl(str(c, 'image'))} alt={str(c, 'heading')} style="width:100%;aspect-ratio:16/9;object-fit:cover" />
        {/if}
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
              {#if str(c, 'heading')}<h2 class="d-l">{str(c, 'heading')}</h2>{/if}
            </div>
            {#if str(c, 'lead')}<p class="body">{str(c, 'lead')}</p>{/if}
          </div>
        {/if}

        {#if items.length === 0}
          <p class="note body">{nl ? 'Nog niets om te tonen.' : 'Nothing to show yet.'}</p>
        {:else if how(c) === 'logos'}
          <div class="logos" style="margin-top:26px">
            {#each items as it (it.id)}
              {#if it.image}
                <a href={it.href || '#'} target="_blank" rel="noopener">
                  <img src={imageUrl(it.image)} alt={it.title} loading="lazy" />
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
          {#each items as it (it.id)}
            <a class="event-row" href={it.href}>
              <div class="event-row-main">
                {#if it.image}<img src={imageUrl(it.image)} alt={it.title} />{/if}
                <div><h3>{it.title}</h3></div>
                <div class="when meta">{it.subtitle}</div>
                <div class="cta">
                  <span class="status">{nl ? 'Bekijk editie' : 'View edition'}</span>
                </div>
              </div>
            </a>
          {/each}
        {:else if how(c) === 'journal_cards'}
          <div class="cards-4" style="margin-top:26px">
            {#each items as it (it.id)}
              <a class="jcard" href={it.href}>
                {#if it.image}<img src={imageUrl(it.image)} alt={it.title} loading="lazy" />{/if}
                <h3>{it.title}</h3>
                {#if it.subtitle}<p class="meta">{it.subtitle}</p>{/if}
              </a>
            {/each}
          </div>
        {:else if how(c) === 'format_rows'}
          {#each items as it, i (it.id)}
            <a class="format-row" href="#{it.id}">
              <span class="n">{String(i + 1).padStart(2, '0')}</span>
              <span class="name">IMPACT <span class="red">[{it.title}]</span></span>
              <p class="body desc">{it.body ?? ''}</p>
              <span class="m">{it.subtitle ?? ''}</span>
            </a>
          {/each}
        {:else if how(c) === 'age_cards'}
          <div class="cards-3" style="margin-top:26px">
            {#each items as it (it.id)}
              <div class="age">
                {#if it.image}<img src={imageUrl(it.image)} alt={it.title} loading="lazy" />{/if}
                <div class="inner">
                  <h3>{it.title}</h3>
                  {#if it.subtitle}<span class="tag">{it.subtitle}</span>{/if}
                  {#if it.body}<p class="body">{it.body}</p>{/if}
                </div>
              </div>
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
                <img class="fund-long-img" src={imageUrl(it.image)} alt={it.title} loading="lazy" />
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
          <h2 class="d-l" style="margin:22px 0 34px">{str(c, 'heading')}</h2>
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
              {#if str(c, 'heading')}<h2 class="d-l">{str(c, 'heading')}</h2>{/if}
            </div>
          </div>
        {/if}
        <div class={routes ? 'routes' : 'layers'} style="margin-top:26px">
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

  {:else if s.type === 'news_band'}
    <section class="news-band" id={s.anchor || undefined}>
      <div class="wrap">
        <h2 class="d-l d-l--40" style="margin:16px 0 12px">
          {str(c, 'heading') || (nl ? 'Blijf op de hoogte' : 'Stay in the loop')}
        </h2>
        {#if str(c, 'body')}<p class="body">{str(c, 'body')}</p>{/if}
        <form class="news-form" data-newsletter novalidate name="newsletter" action="/">
          <input type="hidden" name="form-name" value="newsletter" />
          <input type="hidden" name="bot-field" />
          <div class="field-row">
            <label class="sr-only" for="ps-news-{s.position}">E-mail</label>
            <input
              id="ps-news-{s.position}"
              name="email"
              type="email"
              placeholder={nl ? 'jouw e-mailadres' : 'your email address'}
              required
            />
            <button type="submit" class="pill pill--primary pill--sm">
              {nl ? 'Inschrijven' : 'Subscribe'}
            </button>
          </div>
          <p class="form-msg" role="status"></p>
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
