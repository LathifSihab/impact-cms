<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function when(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head><title>Pagina's — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ Pagina's ]</span>
    <div class="head-row">
      <h1 class="d-m">Pagina-instellingen</h1>
      <a class="pill pill--primary" href="/admin/pages/new">Nieuwe pagina</a>
    </div>
    <p class="body">
      De vaste pagina's van de site: hero, secties en SEO. Events en Journal staan hier niet
      tussen — dat zijn lijsten, die komen uit hun eigen inhoudstypes.
    </p>
  </header>

  {#if data.pages.length === 0}
    <div class="empty">
      <span class="label">[ Leeg ]</span>
      <p class="body">
        Nog geen pagina's. Draai <code class="mono">npm run seed:pages</code> om ze aan te maken
        met de teksten van de bestaande site.
      </p>
    </div>
  {:else}
    <div class="rows">
      <div class="row" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 130px 120px">
        <span class="label">Pagina</span>
        <span class="label hide-sm">Titel</span>
        <span class="label hide-sm">Secties</span>
        <span class="label hide-sm">Zichtbaar</span>
      </div>
      {#each data.pages as p (p.id)}
        <a class="row" href="/admin/pages/{p.id}" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 130px 120px">
          <span class="name">
            {p.navLabel}
            <span class="meta" style="display:block;font-weight:400">
              <span class="mono">/{p.id === 'home' ? '' : p.id}</span>
              {#if p.updatedAt} · {when(p.updatedAt)}{/if}
            </span>
          </span>
          <span class="cell hide-sm">{p.heroTitle}</span>
          <span class="cell num hide-sm">{p.sectionCount}</span>
          <span class="cell hide-sm"><Badge kind="consent" value={p.published} yes="Live" no="Concept" /></span>
        </a>
      {/each}
    </div>
    <p class="meta" style="margin-top:16px">{data.pages.length} pagina's</p>
  {/if}
</div>
