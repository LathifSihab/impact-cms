<script lang="ts">
  import { page } from '$app/state';
  import { path, translator } from '$lib/i18n';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));

  /** The same page in the other language, so the switch does not lose your place. */
  const otherHref = $derived.by(() => {
    const rest = page.url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    return data.locale === 'en' ? rest : `/en${rest === '/' ? '' : rest}`;
  });

  const isEvents = $derived(page.url.pathname.includes('/events'));
  const isJournal = $derived(page.url.pathname.includes('/journal'));
</script>

<svelte:head>
  <link rel="stylesheet" href="/site.css" />
</svelte:head>

<header class="nav">
  <div class="wrap">
    <a class="logo" href={p('/')} aria-label="IMPACT">
      <strong style="font-family:var(--font-display);font-size:20px;letter-spacing:-.01em">
        IMPACT
      </strong>
    </a>
    <nav style="display:flex;align-items:center;gap:28px;font-size:14px;font-weight:600">
      <a href={p('/events')} style:color={isEvents ? 'var(--red)' : undefined}>{t('nav.events')}</a>
      <a href={p('/journal')} style:color={isJournal ? 'var(--red)' : undefined}>
        {t('nav.journal')}
      </a>
      <a href={otherHref} class="meta" style="font-weight:600">{t('lang.other')}</a>
    </nav>
  </div>
</header>

{@render children()}

<footer class="section section--black" style="padding:64px 0">
  <div class="wrap" style="display:flex;justify-content:space-between;gap:32px;flex-wrap:wrap">
    <div>
      <span class="label">[ IMPACT ]</span>
      <p class="body" style="margin-top:12px;max-width:46ch">{t('foot.rendered')}</p>
    </div>
    <div style="display:flex;gap:24px;align-items:flex-start;font-size:13px">
      <a href={p('/events')}>{t('nav.events')}</a>
      <a href={p('/journal')}>{t('nav.journal')}</a>
      <a href="/admin">{t('nav.backoffice')}</a>
    </div>
  </div>
  <div class="wrap" style="margin-top:40px">
    <span class="meta" style="font-size:12px">{t('foot.built')}</span>
  </div>
</footer>
