<script lang="ts">
  import { formatDate, imageUrl, path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
</script>

<svelte:head>
  <title>{t('journal.title')} | IMPACT</title>
  <meta name="description" content={t('journal.lead')} />
</svelte:head>

<section class="section">
  <div class="wrap">
    <span class="label">[ {t('journal.title')} ]</span>
    <h1 class="d-l" style="margin:20px 0 18px">{t('journal.title')}</h1>
    <p class="intro" style="max-width:62ch">{t('journal.lead')}</p>
  </div>
</section>

<section class="section section--sand" style="padding-top:0">
  <div class="wrap">
    {#if data.posts.length === 0}
      <p class="intro">{t('journal.empty')}</p>
    {:else}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px">
        {#each data.posts as post (post.id)}
          <a href={p(`/journal/${post.id}`)} style="background:var(--white);display:block">
            <img
              src={imageUrl(post.image)}
              alt={post.alt}
              loading="lazy"
              style="aspect-ratio:16/9;object-fit:cover;background:var(--placeholder)"
            />
            <div style="padding:22px">
              <span class="tag">{t(`cat.${post.category}` as 'cat.story')}</span>
              <h2 style="font-size:20px;font-weight:800;letter-spacing:-.015em;margin:10px 0 8px">
                {post.title}
              </h2>
              <p class="meta" style="font-size:12.5px">
                {formatDate(post.publishedAt, data.locale)} · {post.meta}
              </p>
              <span class="tag" style="display:inline-block;margin-top:14px">
                {t('journal.read')} →
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
