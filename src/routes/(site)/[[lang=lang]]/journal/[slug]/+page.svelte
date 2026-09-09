<script lang="ts">
  /**
   * /journal/<slug>.
   *
   * The static site has no per-article page — journal.html links nowhere, the
   * cards are not anchors. So this is the one page with no counterpart to
   * transcribe. It is built from the same primitives the rest of the site uses
   * (hero--page, wrap, running, d-l, band, news-band) so it reads as part of the
   * same product rather than inventing a new layout.
   */
  import { formatDate, imageUrl, path, translator } from '$lib/i18n';
  import Img from '$lib/components/site/Img.svelte';
  import { renderMarkdown } from '$lib/markdown';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');
  const post = $derived(data.post);
  /* Safe to inject: renderMarkdown escapes the source before re-introducing a
     fixed set of tags, so nothing stored can become markup. See lib/markdown.ts. */
  const html = $derived(renderMarkdown(post.body));
</script>

<svelte:head>
  <title>{post.title} | IMPACT</title>
  <meta name="description" content={post.meta} />
</svelte:head>

<header class="hero hero--page" data-reveal-root>
  <div class="hero-content wrap">
    <div>
      <span class="label reveal">[ {t(`cat.${post.category}` as 'cat.story')} ]</span>
      <h1 class="d-xl reveal">{post.title}</h1>
      <p class="intro reveal">{post.meta}</p>
    </div>
  </div>
</header>

<section class="section" style="padding-top:0">
  <div class="wrap" style="max-width:900px">
    <Img
      src={post.image}
      alt={post.alt}
      role="wide"
      style="width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--placeholder)"
    />
    <p class="meta" style="margin-top:14px">
      {formatDate(post.publishedAt, data.locale)} · {post.meta}
    </p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap prose" style="max-width:760px">
    {@html html}

    {#if post.relatedEvent}
      <div style="margin-top:48px;border-top:1px solid var(--border);padding-top:26px">
        <span class="running">{t('journal.related')}</span>
        <a
          class="pill pill--secondary"
          style="margin-top:16px"
          href={p(`/events/${post.relatedEvent.id}`)}
        >
          {post.relatedEvent.title}
        </a>
      </div>
    {/if}

    <p style="margin-top:40px">
      <a class="meta" href={p('/journal')}>← {t('journal.back')}</a>
    </p>
  </div>
</section>

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
    <form class="news-form" data-newsletter novalidate name="newsletter" action="/api/subscribe">
      <input type="hidden" name="form-name" value="newsletter" />
      <input type="hidden" name="bot-field" />
      <div class="field-row">
        <label class="sr-only" for="a-news">E-mail</label>
        <input
          id="a-news"
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

<style>
  .prose :global(p) {
    font-size: 16.5px;
    line-height: 1.75;
    color: var(--grey-body);
    margin-bottom: 20px;
  }
  .prose :global(h2),
  .prose :global(h3) {
    font-weight: 800;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin: 36px 0 12px;
  }
  .prose :global(h2) {
    font-size: 26px;
  }
  .prose :global(h3) {
    font-size: 20px;
  }
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 20px 22px;
    color: var(--grey-body);
    line-height: 1.75;
  }
  .prose :global(ul) {
    list-style: disc;
  }
  .prose :global(ol) {
    list-style: decimal;
  }
  .prose :global(blockquote) {
    border-left: 3px solid var(--red);
    padding-left: 20px;
    margin: 0 0 20px;
  }
  .prose :global(a) {
    color: var(--red);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .prose :global(hr) {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 36px 0;
  }
</style>
