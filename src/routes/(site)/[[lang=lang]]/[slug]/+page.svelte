<script lang="ts">
  import PageHero from '$lib/components/site/PageHero.svelte';
  import PageSections from '$lib/components/site/PageSections.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const p = $derived(data.page);
  const nl = $derived(data.locale === 'nl');
</script>

<svelte:head>
  <title>{p.seo.title || `${p.heroTitle} | IMPACT`}</title>
  <meta name="description" content={p.seo.description || p.heroIntro} />
</svelte:head>

<PageHero page={p} />
<PageSections sections={p.sections} collections={data.collections} {nl} />
