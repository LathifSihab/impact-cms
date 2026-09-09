<script lang="ts">
  import '../../app.css';
  import { page } from '$app/state';
  import { COLLECTIONS, NAV_ORDER } from '$lib/collections';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const current = $derived(page.url.pathname);
  const isContent = (key: string) => current.startsWith(`/admin/content/${key}`);
</script>

<div class="shell">
  <aside class="side">
    <a class="brand" href="/admin">
      <strong>IMPACT</strong>
      <span>Backoffice</span>
    </a>

    <div class="group">
      <span class="label">[ Overzicht ]</span>
      <nav>
        <a href="/admin" aria-current={current === '/admin' ? 'page' : undefined}>Dashboard</a>
        <a href="/admin/signalen" aria-current={current.startsWith('/admin/signalen') ? 'page' : undefined}>
          Signalen
        </a>
        <a href="/admin/pages" aria-current={current.startsWith('/admin/pages') ? 'page' : undefined}>
          Pagina's
        </a>
      </nav>
    </div>

    <div class="group">
      <span class="label">[ Inhoud ]</span>
      <nav>
        {#each NAV_ORDER as key (key)}
          <a href="/admin/content/{key}" aria-current={isContent(key) ? 'page' : undefined}>
            <span>{COLLECTIONS[key].label}</span>
            <span class="count">{data.counts[key] ?? '—'}</span>
          </a>
        {/each}
      </nav>
    </div>

    <div class="foot">
      Inschrijvingen, tickets en deelnemers staan in
      <a href="https://www.tickettailor.com/" target="_blank" rel="noreferrer">Ticket Tailor</a>,
      niet hier.
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <span class="label">[ wemakeimpact.be ]</span>
      <div style="display:flex;align-items:center;gap:16px">
        <span class="who">{data.email ?? ''}</span>
        <form method="POST" action="/auth/signout">
          <button class="pill pill--quiet pill--sm">Uitloggen</button>
        </form>
      </div>
    </div>

    {@render children()}
  </div>
</div>
