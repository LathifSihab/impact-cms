<script lang="ts">
  /** The hero every configured page shares, in the site's own markup. */
  import { imageUrl } from '$lib/i18n';
  import type { PageRecord } from '$lib/server/pages';

  let { page }: { page: PageRecord } = $props();

  const variantClass = $derived(
    page.heroVariant === 'home'
      ? 'hero'
      : page.heroVariant === 'overlaid'
        ? 'hero hero--page hero--overlaid'
        : page.heroVariant === 'event'
          ? 'hero hero--event'
          : 'hero hero--page'
  );
</script>

<header class={variantClass} data-reveal-root>
  {#if page.heroImage}
    <img src={imageUrl(page.heroImage)} alt={page.heroTitle} />
  {/if}
  <div class="hero-content wrap">
    <div>
      {#if page.heroLabel}<span class="label reveal">{page.heroLabel}</span>{/if}
      <h1 class="d-xl reveal">{page.heroTitle}</h1>
      {#if page.heroIntro}<p class="intro reveal">{page.heroIntro}</p>{/if}
    </div>
  </div>
</header>
