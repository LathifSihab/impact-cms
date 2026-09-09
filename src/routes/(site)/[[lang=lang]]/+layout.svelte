<script lang="ts">
  import { onMount } from 'svelte';
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

  /**
   * The site's own scripts, loaded after hydration.
   *
   * They cannot go in <svelte:head>. A deferred script in the head runs before
   * Svelte hydrates, so main.js binds its listeners to the server-rendered
   * nodes and hydration then replaces them — the dome's close button stops
   * closing anything, and [data-reveal] elements never receive `.is-in`, which
   * leaves them at opacity:0 forever because that is what the stylesheet does
   * while `.js` is on the root.
   *
   * onMount runs after hydration, so these bind to the DOM that actually stays.
   * Order matters: boxoffice.js reads window.impactConsent, which consent.js
   * defines.
   */
  onMount(() => {
    const sources = ['/assets/js/consent.js', '/assets/js/main.js', '/assets/js/boxoffice.js'];

    /* The reveal CSS hides [data-reveal] until main.js marks it visible, so
       anything that stops main.js would leave the page blank rather than
       unanimated. Both escape hatches drop `.js`, which turns that styling off. */
    const showEverything = () => document.documentElement.classList.remove('js');

    let i = 0;
    const loadNext = () => {
      if (i >= sources.length) return;
      const el = document.createElement('script');
      el.src = sources[i++];
      el.onload = loadNext;
      el.onerror = () => {
        showEverything();
        loadNext();
      };
      document.body.appendChild(el);
    };
    loadNext();

    // …and if it loaded but never ran (a throw partway through), catch that too.
    const guard = setTimeout(() => {
      const hidden = document.querySelectorAll('[data-reveal]:not(.is-in)');
      if (hidden.length) showEverything();
    }, 3000);

    return () => clearTimeout(guard);
  });
</script>

<SiteShell locale={data.locale} {section} staticBase={data.staticBase} slugs={data.slugs}>
  {@render children()}
</SiteShell>
