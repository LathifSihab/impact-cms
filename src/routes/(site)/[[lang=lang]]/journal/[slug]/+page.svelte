<script lang="ts">
  import { formatDate, imageUrl, path, translator } from '$lib/i18n';
  import { renderMarkdown } from '$lib/markdown';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const post = $derived(data.post);
  /* Safe to inject: renderMarkdown escapes the source before re-introducing a
     fixed set of tags, so nothing stored can become markup. See lib/markdown.ts. */
  const html = $derived(renderMarkdown(post.body));
</script>

<svelte:head>
  <title>{post.title} | IMPACT</title>
  <meta name="description" content={post.meta} />
</svelte:head>

<section class="section" style="padding-bottom:40px">
  <div class="wrap" style="max-width:820px">
    <a class="meta" href={p('/journal')}>← {t('journal.back')}</a>
    <span class="tag" style="display:block;margin-top:22px">
      {t(`cat.${post.category}` as 'cat.story')}
    </span>
    <h1 class="d-m" style="margin:14px 0 16px">{post.title}</h1>
    <p class="meta">{formatDate(post.publishedAt, data.locale)} · {post.meta}</p>
  </div>
</section>

<div class="wrap" style="max-width:820px">
  <img
    src={imageUrl(post.image)}
    alt={post.alt}
    style="width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--placeholder)"
  />
</div>

<section class="section" style="padding-top:48px">
  <div class="wrap prose" style="max-width:820px">
    {@html html}

    {#if post.relatedEvent}
      <div style="margin-top:48px;border-top:1px solid var(--border);padding-top:24px">
        <span class="label">[ {t('journal.related')} ]</span>
        <a
          class="pill pill--secondary pill--sm"
          style="margin-top:14px"
          href={p(`/events/${post.relatedEvent.id}`)}
        >
          {post.relatedEvent.title}
        </a>
      </div>
    {/if}
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
  .prose :global(code) {
    font-family: var(--mono);
    font-size: 0.9em;
    background: var(--bone);
    padding: 2px 5px;
  }
  .prose :global(hr) {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 36px 0;
  }
</style>
