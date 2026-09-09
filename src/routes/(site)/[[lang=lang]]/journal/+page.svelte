<script lang="ts">
  /**
   * /journal — site/journal.html, with the cards coming from the database.
   *
   *   feature   <- the most recent post
   *   grid      <- the rest, as .jcard articles carrying data-cat
   *
   * The filter chips are the static site's own: main.js binds
   * [data-filter-group] to [data-filter-list] and shows or hides cards by their
   * data-cat. Reproducing the attributes means that behaviour works here without
   * reimplementing it.
   */
  import { formatDate, imageUrl, path, translator } from '$lib/i18n';
  import { JOURNAL_CATEGORIES } from '$lib/collections';
  import PageSections from '$lib/components/site/PageSections.svelte';
  import { extraSections } from '$lib/pages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');

  const cfg = $derived(data.page);
  const feature = $derived(data.posts[0] ?? null);
  const rest = $derived(data.posts.slice(1));

  const catLabel = (c: string) => t(`cat.${c}` as 'cat.story');

  /** Only offer a chip for a category that actually has posts. */
  const chips = $derived(
    JOURNAL_CATEGORIES.filter((c) => data.posts.some((post) => post.category === c.value))
  );
</script>

<svelte:head>
  <title>Journal | IMPACT</title>
  <meta name="description" content={t('journal.lead')} />
</svelte:head>

<header class="hero hero--page" data-reveal-root>
  {#if cfg?.heroImage}
    <img src={imageUrl(cfg.heroImage)} alt={cfg.heroTitle} />
  {/if}
  <div class="hero-content wrap">
    <div>
      <span class="label reveal">{cfg?.heroLabel || '[ Journal ]'}</span>
      <h1 class="d-xl reveal">{cfg?.heroTitle || 'What we lived, learned and built.'}</h1>
      <p class="intro reveal">
        {cfg?.heroIntro ||
          (nl
            ? 'Journal is ons levende archief: recaps, verhalen, interviews, expert content, partnerverhalen en nieuws.'
            : 'The Journal is our living archive: recaps, stories, interviews, expert content, partner stories and news.')}
      </p>
    </div>
  </div>
</header>

{#if feature}
  <!-- featured -->
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <a class="feature" data-cat={feature.category} href={p(`/journal/${feature.id}`)}>
        <img src={imageUrl(feature.image)} alt={feature.alt} loading="lazy" />
        <div>
          <span class="tag">{catLabel(feature.category)}</span>
          <h2 class="d-l d-l--48" style="margin:14px 0 18px">{feature.title}</h2>
          <p class="intro">{feature.meta}</p>
          <p class="meta" style="margin-top:18px">
            {formatDate(feature.publishedAt, data.locale)}
          </p>
        </div>
      </a>
    </div>
  </section>
{/if}

<!-- grid -->
<section class="section" style="padding-top:0">
  <div class="wrap">
    {#if chips.length > 1}
      <div class="filters" data-filter-group>
        <button class="chip is-on" data-filter="all">{nl ? 'Alles' : 'All'}</button>
        {#each chips as c (c.value)}
          <button class="chip" data-filter={c.value}>{catLabel(c.value)}</button>
        {/each}
      </div>
    {/if}

    <div class="cards-3" data-filter-list>
      {#each rest as post (post.id)}
        <a class="jcard" data-cat={post.category} href={p(`/journal/${post.id}`)}>
          <img src={imageUrl(post.image)} alt={post.alt} loading="lazy" />
          <span class="tag">{catLabel(post.category)}</span>
          <h3>{post.title}</h3>
          <p class="meta">{post.meta}</p>
        </a>
      {/each}
    </div>

    {#if data.posts.length === 0}
      <p class="note body">{t('journal.empty')}</p>
    {/if}
  </div>
</section>

<PageSections sections={extraSections(cfg, [])} {nl} />

<section class="news-band">
  <div class="wrap">
    <h2 class="d-l d-l--40" style="margin:16px 0 12px">
      {nl ? 'Blijf op de hoogte' : 'Join the IMPACT community'}
    </h2>
    <p class="body">
      {nl
        ? 'Nieuwe verhalen, events en partnerships. Eén mail per maand.'
        : 'New stories, events and partnerships. One mail a month.'}
    </p>
    <form class="news-form" data-newsletter novalidate name="newsletter" action="/">
      <input type="hidden" name="form-name" value="newsletter" />
      <input type="hidden" name="bot-field" />
      <div class="field-row">
        <label class="sr-only" for="j-news">E-mail</label>
        <input
          id="j-news"
          name="email"
          type="email"
          placeholder={nl ? 'jouw e-mailadres' : 'your email address'}
          required
        />
        <button type="submit" class="pill pill--primary pill--sm">
          {nl ? 'Inschrijven' : 'Subscribe'}
        </button>
      </div>
      <p class="form-msg" role="status"></p>
    </form>
  </div>
</section>
