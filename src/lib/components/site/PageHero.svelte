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

  let { page, nl = true }: { page: PageRecord; nl?: boolean } = $props();

  const isHome = $derived(page.heroVariant === 'home');
  const isOverlaid = $derived(page.heroVariant === 'overlaid');
  /* The legal pages use a quieter hero: no image, no reveal, and the standfirst
     styled as .stand rather than an intro. */
  const isPlain = $derived(page.heroVariant === 'plain');

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

{#snippet pageBody()}
      <div>
        {#if page.heroLabel}<span class="label reveal">{page.heroLabel}</span>{/if}
        <h1 class="d-xl reveal">{page.heroTitle}</h1>
        {#if page.heroIntro}<p class="intro reveal">{page.heroIntro}</p>{/if}

        {#if page.heroTrust.length}
          <ul class="trust reveal">
            {#each page.heroTrust as item (item)}<li>{item}</li>{/each}
          </ul>
        {/if}

        {#if page.heroAnchorNav.length}
          <nav class="anchor-nav reveal" aria-label={nl ? 'Secties op deze pagina' : 'Sections on this page'}>
            {#each page.heroAnchorNav as link (link.href)}
              <a href={link.href}>{link.label}</a>
            {/each}
          </nav>
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

      {#if page.heroOverlayMeta.length}
        <div class="overlay-meta reveal">
          {#each page.heroOverlayMeta as item (item.heading)}
            <div class="item">
              <h3>{item.heading}</h3>
              <p>{item.body}</p>
            </div>
          {/each}
        </div>
      {/if}
{/snippet}

{#if isPlain}
  <header class="hero hero--page">
    <div class="wrap">
      {#if page.heroLabel}<span class="running">{page.heroLabel}</span>{/if}
      <h1 class="d-xl">{page.heroTitle}</h1>
      {#if page.heroIntro}<p class="stand">{page.heroIntro}</p>{/if}
    </div>
  </header>
{:else}
<header class={variantClass} data-reveal-root>
  {#if page.heroImage}
    <!-- The still is also the poster. main.js reads data-video-webm off it,
         probes that file, and only when it resolves — and prefers-reduced-motion
         is not set — mounts a muted looping <video> over the hero. So a page
         with no clip renders exactly as it does without these attributes. -->
    <Img
      src={page.heroImage}
      alt={page.heroTitle}
      role="wide"
      sizes="100vw"
      data-hero-poster=""
      data-video-webm={page.heroVideoWebm ? imageUrl(page.heroVideoWebm) : undefined}
      data-video-mp4={page.heroVideoMp4 ? imageUrl(page.heroVideoMp4) : undefined}
    />
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
    {:else if isOverlaid}
      <!-- The overlaid hero nests one more level: the copy and the meta blocks
           are siblings inside a wrapper, which is what lays them over the image
           side by side. -->
      <div>{@render pageBody()}</div>
    {:else}
      {@render pageBody()}
    {/if}
  </div>
</header>
{/if}
