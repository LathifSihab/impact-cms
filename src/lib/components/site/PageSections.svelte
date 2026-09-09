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
          <p class="note body">
            {nl ? 'Nog niets om te tonen.' : 'Nothing to show yet.'}
          </p>
        {:else if str(c, 'source') === 'partners'}
          <div class="logos" style="margin-top:26px">
            {#each items as it (it.id)}
              {#if it.image}
                <a href={it.href || '#'} target="_blank" rel="noopener">
                  <img src={imageUrl(it.image)} alt={it.title} loading="lazy" />
                </a>
              {/if}
            {/each}
          </div>
        {:else if str(c, 'source') === 'events'}
          <!-- The site's own row for an edition, so a teaser on the homepage is
               the same component as the list on /events. -->
          {#each items as it (it.id)}
            <a class="event-row" href={it.href}>
              <div class="event-row-main">
                {#if it.image}<img src={imageUrl(it.image)} alt={it.title} />{/if}
                <div><h3>{it.title}</h3></div>
                <div class="when meta">{it.subtitle}</div>
                <div class="cta"><span class="status">{nl ? 'Bekijk editie' : 'View edition'} →</span></div>
              </div>
            </a>
          {/each}
        {:else if str(c, 'source') === 'journal'}
          <div class="cards-3" style="margin-top:26px">
            {#each items as it (it.id)}
              <a class="jcard" href={it.href}>
                {#if it.image}<img src={imageUrl(it.image)} alt={it.title} loading="lazy" />{/if}
                <h3>{it.title}</h3>
                {#if it.subtitle}<p class="meta">{it.subtitle}</p>{/if}
              </a>
            {/each}
          </div>
        {:else if str(c, 'source') === 'figures'}
          <div class="stats" style="margin-top:26px">
            {#each items as it (it.id)}
              <div class="stat">
                <div class="n">{it.title}</div>
                <div class="k">{it.subtitle}</div>
                {#if it.body}<p class="body">{it.body}</p>{/if}
              </div>
            {/each}
          </div>
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
