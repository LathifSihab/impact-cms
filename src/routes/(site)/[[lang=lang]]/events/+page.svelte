<script lang="ts">
  import { path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));

  const upcoming = $derived(data.events.filter((e) => e.status !== 'past'));
  const past = $derived(data.events.filter((e) => e.status === 'past'));
</script>

<svelte:head>
  <title>{t('events.title')} | IMPACT</title>
  <meta name="description" content={t('events.lead')} />
</svelte:head>

<section class="section">
  <div class="wrap">
    <span class="label">[ {t('events.title')} ]</span>
    <h1 class="d-l" style="margin:20px 0 18px">{t('events.title')}</h1>
    <p class="intro" style="max-width:62ch">{t('events.lead')}</p>
  </div>
</section>

{#snippet row(e: (typeof data.events)[number])}
  <a class="event-row" href={p(`/events/${e.id}`)}>
    <div class="event-row-main">
      <div class="when meta">
        <strong>{e.dateText}</strong>
        {e.location}
      </div>
      <div>
        <span class="tag">{e.formatName ?? ''}</span>
        <span class="tag tag--dim">{e.ageMin}–{e.ageMax} {t('event.years')}</span>
        <h3>{e.title}</h3>
        <p class="body" style="margin-top:8px;max-width:70ch">{e.standfirst}</p>
      </div>
      <div class="meta">{e.price ?? ''}</div>
      <div class="cta">
        <span class="tag">{t(`status.${e.status}` as 'status.waitlist')}</span>
        <span class="status">{t('events.view')} →</span>
      </div>
    </div>
  </a>
{/snippet}

<section class="section section--sand" style="padding-top:0">
  <div class="wrap">
    {#if data.events.length === 0}
      <p class="intro">{t('events.empty')}</p>
    {:else}
      {#if upcoming.length}
        <h2 class="h" style="margin-bottom:16px">{t('events.upcoming')}</h2>
        {#each upcoming as e (e.id)}{@render row(e)}{/each}
      {/if}

      {#if past.length}
        <h2 class="h" style="margin:56px 0 16px">{t('events.past')}</h2>
        {#each past as e (e.id)}{@render row(e)}{/each}
      {/if}
    {/if}
  </div>
</section>
