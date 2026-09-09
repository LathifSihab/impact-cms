<script lang="ts">
  import PageHero from '$lib/components/site/PageHero.svelte';
  import PageSections from '$lib/components/site/PageSections.svelte';
  import { formatDate, path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');
</script>

<svelte:head>
  <title>{data.page?.seo?.title || 'IMPACT'}</title>
  <meta name="description" content={data.page?.seo?.description || data.page?.heroIntro || ''} />
</svelte:head>

{#if data.page}
  <PageHero page={data.page} />
  <PageSections sections={data.page.sections} collections={data.collections} {nl} />
{:else}
  <!-- Unseeded install: no home record yet. -->
  <section class="section">
    <div class="wrap">
      <span class="label">[ IMPACT ]</span>
      <h1 class="d-l" style="margin:20px 0 18px">{t('nav.events')} &amp; {t('nav.journal')}</h1>
      <p class="intro" style="max-width:64ch">{t('foot.rendered')}</p>
      <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap">
        <a class="pill pill--primary" href={p('/events')}>{t('nav.events')}</a>
        <a class="pill pill--secondary" href={p('/journal')}>{t('nav.journal')}</a>
      </div>
    </div>
  </section>

  <section class="section section--sand">
    <div class="wrap">
      <h2 class="h" style="margin-bottom:18px">{t('events.upcoming')}</h2>
      {#each data.events as e (e.id)}
        <a class="event-row" href={p(`/events/${e.id}`)}>
          <div class="event-row-main">
            <div class="when meta"><strong>{e.dateText}</strong>{e.location}</div>
            <div><span class="tag">{e.formatName ?? ''}</span><h3>{e.title}</h3></div>
            <div class="meta">{e.ageMin}–{e.ageMax} {t('event.years')}</div>
            <div class="cta"><span class="tag">{t(`status.${e.status}` as 'status.waitlist')}</span></div>
          </div>
        </a>
      {/each}

      <h2 class="h" style="margin:56px 0 18px">{t('journal.title')}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
        {#each data.posts as post (post.id)}
          <a href={p(`/journal/${post.id}`)} style="background:var(--white);padding:22px;display:block">
            <span class="tag">{t(`cat.${post.category}` as 'cat.story')}</span>
            <h3 style="font-size:18px;font-weight:800;margin:8px 0 6px">{post.title}</h3>
            <p class="meta" style="font-size:12.5px">{formatDate(post.publishedAt, data.locale)}</p>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
