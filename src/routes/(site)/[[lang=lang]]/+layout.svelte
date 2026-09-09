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

    /* GSAP's two consumers: the preloader curtain and the scroll-driven reel.
     *
     * Both are loaded on their own chain so they do not wait behind main.js,
     * and both only when the page actually has them — the preloader runs once
     * a session, the reel only exists on the homepage, and neither should cost
     * every other page 70 kB of GSAP.
     *
     * Each reads its globals at call time and bails out quietly when they are
     * missing, so a blocked CDN costs the animation and nothing else: the
     * curtain is lifted by the failsafe in app.html, and the reel's clips stay
     * scrollable and playable. */
    const preloading = document.documentElement.classList.contains('is-preloading');
    // cinema.js drives both the pinned reel and the Media showcase video.
    const cinema = Boolean(document.querySelector('[data-cinema], [data-cine]'));

    /* The photo archive opens in a lightbox. Loaded only where there is one. */
    if (document.querySelector('[data-gallery]')) {
      const el = document.createElement('script');
      el.src = '/assets/js/lightbox.js';
      document.body.appendChild(el);
    }

    if (preloading || cinema) {
      const chain = ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js'];
      // preloader.js first: the curtain is on screen and the visitor is waiting.
      if (preloading) chain.push('/assets/js/preloader.js');
      if (cinema) {
        chain.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js');
        chain.push('/assets/js/cinema.js');
      }

      let j = 0;
      const loadGsap = () => {
        if (j >= chain.length) return;
        const el = document.createElement('script');
        el.src = chain[j++];
        el.onload = loadGsap;
        /* Order is a real dependency here — ScrollTrigger needs gsap, and both
           consumers need their plugin — so a failure stops the chain rather
           than running a consumer without what it reads. */
        el.onerror = () => {};
        document.body.appendChild(el);
      };
      loadGsap();
    }

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
