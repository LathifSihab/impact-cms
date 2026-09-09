<script lang="ts">
  /** A 404 on the public site, inside the site's own shell. */
  import { page } from '$app/state';
  import { path, translator } from '$lib/i18n';
  import type { LayoutData } from './$types';

  let { data }: { data: LayoutData } = $props();
  const t = $derived(translator(data?.locale ?? 'nl'));
  const p = $derived((rest: string) => path(data?.locale ?? 'nl', rest));
</script>

<svelte:head><title>{page.status} | IMPACT</title></svelte:head>

<header class="hero hero--page" data-reveal-root>
  <div class="hero-content wrap">
    <div>
      <span class="label reveal">[ {page.status} ]</span>
      <h1 class="d-xl reveal">{t('nf.title')}</h1>
      <p class="intro reveal">{t('nf.body')}</p>
    </div>
  </div>
</header>

<section class="section">
  <div class="wrap" style="display:flex;gap:12px;flex-wrap:wrap">
    <a class="pill pill--primary" href={p('/events')}>{t('nav.events')}</a>
    <a class="pill pill--secondary" href={p('/journal')}>{t('nav.journal')}</a>
  </div>
</section>
