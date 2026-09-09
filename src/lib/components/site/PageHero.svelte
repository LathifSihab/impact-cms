<script lang="ts">
  /**
   * The hero every configured page shares, in the site's own markup.
   *
   * The homepage hero is a different shape from the others — the headline sits
   * above a trust list, and the standfirst moves into a `hero-bottom` block next
   * to two calls to action — so `home` renders that arrangement and everything
   * else keeps the simpler page hero. Both come from the same record.
   */
  import { imageUrl } from '$lib/i18n';
  import Img from './Img.svelte';
  import type { PageRecord } from '$lib/pages';

  let { page }: { page: PageRecord } = $props();

  const isHome = $derived(page.heroVariant === 'home');

  const variantClass = $derived(
    isHome
      ? 'hero'
      : page.heroVariant === 'overlaid'
        ? 'hero hero--page hero--overlaid'
        : page.heroVariant === 'event'
          ? 'hero hero--event'
          : 'hero hero--page'
  );

  const hasCta = $derived(!!(page.heroCtaLabel && page.heroCtaHref));
  const hasCta2 = $derived(!!(page.heroCta2Label && page.heroCta2Href));
</script>

<header class={variantClass} data-reveal-root>
  {#if page.heroImage}
    <Img src={page.heroImage} alt={page.heroTitle} role="wide" />
  {/if}

  <div class="hero-content wrap">
    {#if isHome}
      <!-- data-split is what main.js keys the line-by-line reveal off. -->
      <h1 class="d-xl reveal" data-split>{page.heroTitle}</h1>

      {#if page.heroTrust.length}
        <ul class="trust reveal">
          {#each page.heroTrust as item (item)}<li>{item}</li>{/each}
        </ul>
      {/if}

      {#if page.heroIntro || hasCta || hasCta2}
        <div class="hero-bottom reveal">
          {#if page.heroIntro}<p>{page.heroIntro}</p>{/if}
          {#if hasCta || hasCta2}
            <div class="actions">
              {#if hasCta}
                <a href={page.heroCtaHref} class="pill pill--primary">{page.heroCtaLabel}</a>
              {/if}
              {#if hasCta2}
                <a href={page.heroCta2Href} class="pill pill--ghost">{page.heroCta2Label}</a>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <div>
        {#if page.heroLabel}<span class="label reveal">{page.heroLabel}</span>{/if}
        <h1 class="d-xl reveal">{page.heroTitle}</h1>
        {#if page.heroIntro}<p class="intro reveal">{page.heroIntro}</p>{/if}

        {#if page.heroTrust.length}
          <ul class="trust reveal">
            {#each page.heroTrust as item (item)}<li>{item}</li>{/each}
          </ul>
        {/if}

        {#if hasCta || hasCta2}
          <div class="actions reveal" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px">
            {#if hasCta}
              <a href={page.heroCtaHref} class="pill pill--primary">{page.heroCtaLabel}</a>
            {/if}
            {#if hasCta2}
              <a href={page.heroCta2Href} class="pill pill--secondary">{page.heroCta2Label}</a>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</header>
