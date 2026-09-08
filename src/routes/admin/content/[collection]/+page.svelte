<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const c = $derived(data.collection);

  /** Name column, then one track per remaining list column. */
  const template = $derived(
    `minmax(0,1.4fr) ${c.list
      .slice(1)
      .map((col) => (col.kind === 'status' || col.kind === 'consent' ? '150px' : 'minmax(0,1fr)'))
      .join(' ')}`
  );

  let q = $state('');

  const shown = $derived(
    q.trim()
      ? data.records.filter((r) =>
          Object.values(r).join(' ').toLowerCase().includes(q.trim().toLowerCase())
        )
      : data.records
  );

  function cell(row: Record<string, unknown>, name: string): string {
    const v = row[name];
    if (v == null || v === '') return '—';
    return String(v);
  }

  function when(iso: unknown): string {
    if (!iso) return '';
    return new Date(String(iso)).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<svelte:head><title>{c.label} — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ Inhoud ]</span>
    <div class="head-row">
      <div>
        <h1 class="d-m">{c.label}</h1>
      </div>
      {#if !c.fixed}
        <a class="pill pill--primary" href="/admin/content/{c.key}/new">Nieuw {c.one}</a>
      {/if}
    </div>
    <p class="body" style="margin-top:12px">{c.blurb}</p>
  </header>

  {#if data.records.length > 6}
    <div class="field" style="max-width:340px">
      <label for="q">Zoeken</label>
      <input id="q" type="text" bind:value={q} placeholder="Filter op elke waarde" />
    </div>
  {/if}

  {#if data.records.length === 0}
    <div class="empty">
      <span class="label">[ Leeg ]</span>
      <p class="body">
        {#if c.key === 'testimonials'}
          Leeg, en dat is de juiste toestand. Er is geen schriftelijke toestemming op
          dossier voor citaten van ouders of deelnemers. Vul dit niet met verzonnen quotes.
        {:else}
          Nog geen {c.label.toLowerCase()}. Draai <code class="mono">npm run seed</code> voor de
          echte inhoud uit <code class="mono">reference/content/</code>, of maak er hier één aan.
        {/if}
      </p>
      {#if !c.fixed && c.key !== 'testimonials'}
        <a class="pill pill--secondary pill--sm" style="margin-top:18px" href="/admin/content/{c.key}/new">
          Nieuw {c.one}
        </a>
      {/if}
    </div>
  {:else}
    <div class="rows">
      <div class="row" style="grid-template-columns:{template}">
        {#each c.list as col, i (col.name)}
          <span class="label" class:hide-sm={i > 0 && i < c.list.length - 1}>{col.label}</span>
        {/each}
      </div>

      {#each shown as row (row.id)}
        <a class="row" href="/admin/content/{c.key}/{row.id}" style="grid-template-columns:{template}">
          {#each c.list as col, i (col.name)}
            {#if i === 0}
              <span class="name">
                {cell(row, col.name)}
                {#if c.gate && row[c.gate] !== true}
                  <span class="tag" style="margin-left:8px">niet gepubliceerd</span>
                {/if}
              </span>
            {:else if col.kind === 'status'}
              <span class="cell"><Badge kind="status" value={row[col.name]} /></span>
            {:else if col.kind === 'consent'}
              <span class="cell"><Badge kind="consent" value={row[col.name]} /></span>
            {:else if col.kind === 'date'}
              <span class="cell num hide-sm">{when(row[col.name])}</span>
            {:else}
              <span class="cell hide-sm">{cell(row, col.name)}</span>
            {/if}
          {/each}
        </a>
      {/each}
    </div>

    {#if shown.length === 0}
      <div class="notice" style="margin-top:16px">Niets gevonden voor “{q}”.</div>
    {/if}

    <p class="meta" style="margin-top:16px">
      {shown.length} van {data.records.length}
      {data.records.length === 1 ? 'record' : 'records'}
    </p>
  {/if}
</div>
