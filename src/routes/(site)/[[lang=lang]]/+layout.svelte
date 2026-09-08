<script lang="ts">
  import { page } from '$app/state';
  import SiteShell from '$lib/components/site/SiteShell.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const section = $derived(
    page.url.pathname.includes('/journal')
      ? ('journal' as const)
      : page.url.pathname.includes('/events')
        ? ('events' as const)
        : ('' as const)
  );
</script>

<svelte:head>
  <!-- The site's own behaviours: sticky nav, mobile menu, reveal on scroll,
       cookie consent, the newsletter dome and the box office widget. Loaded
       from the copied assets folder so this is the same code the static pages
       run, not a re-implementation. -->
  <script src="/assets/js/consent.js"></script>
  <script defer src="/assets/js/boxoffice.js"></script>
  <script defer src="/assets/js/main.js"></script>
</svelte:head>

<SiteShell locale={data.locale} {section} staticBase={data.staticBase}>
  {@render children()}
</SiteShell>
