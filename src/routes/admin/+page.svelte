<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function when(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<svelte:head><title>Dashboard — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ Dashboard ]</span>
    <h1 class="d-m">Inhoud van de site</h1>
    <p class="body">
      Dit beheert wat er op wemakeimpact.be staat. Het publiceert de site nog niet — de
      pagina's zijn nu statische HTML die apart gebouwd wordt. Inschrijvingen, tickets en
      deelnemers staan in Ticket Tailor.
    </p>
  </header>

  <div class="tiles">
    <div class="tile">
      <div class="n">{data.tiles.events}</div>
      <div class="k">Events</div>
    </div>
    <div class="tile">
      <div class="n">{data.tiles.waitlist}</div>
      <div class="k">Met wachtlijst</div>
    </div>
    <div class="tile">
      <div class="n">{data.tiles.open}</div>
      <div class="k">Inschrijvingen open</div>
    </div>
    <div class="tile" class:alert={data.tiles.blocked > 0}>
      <div class="n">{data.tiles.blocked}</div>
      <div class="k">Wacht op toestemming</div>
    </div>
  </div>

  <section style="margin-top:44px">
    <div class="head-row" style="margin-bottom:16px">
      <h2 class="h">Events</h2>
      <a class="pill pill--secondary pill--sm" href="/admin/content/events">Alle events</a>
    </div>

    {#if data.events.length === 0}
      <div class="empty">
        <span class="label">[ Leeg ]</span>
        <p class="body">
          Er staan nog geen events in de database. Draai <code class="mono">npm run seed</code> om
          de echte inhoud uit <code class="mono">reference/content/</code> te laden.
        </p>
      </div>
    {:else}
      <div class="rows">
        {#each data.events as e (e.id)}
          <a class="row" href="/admin/content/events/{e.id}" style="grid-template-columns:minmax(0,1fr) 150px 150px">
            <span class="name">{e.title}</span>
            <span class="cell hide-sm">{e.date_text}</span>
            <span class="cell"><Badge kind="status" value={e.status} /></span>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section style="margin-top:44px">
    <h2 class="h" style="margin-bottom:6px">Wacht op toestemming</h2>
    <p class="body" style="margin-bottom:16px;max-width:64ch">
      Deze records bestaan wel maar publiceren niet. Het vinkje betekent dat een mens
      geverifieerd heeft dat dit gepubliceerd mag worden — een verkeerd vinkje zet iemands
      naam op een openbare site.
    </p>

    {#if data.blocked.length === 0}
      <div class="notice notice--ok">Alles wat er staat, mag gepubliceerd worden.</div>
    {:else}
      <div class="rows">
        {#each data.blocked as b (b.collection + b.id)}
          <a
            class="row"
            href="/admin/content/{b.collection}/{b.id}"
            style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 120px"
          >
            <span class="name">{b.title}</span>
            <span class="cell hide-sm">{b.reason}</span>
            <span class="cell"><Badge kind="consent" value={false} yes="Ja" no="Geblokkeerd" /></span>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  {#if data.recent.length}
    <section style="margin-top:44px">
      <h2 class="h" style="margin-bottom:16px">Laatst bewerkt</h2>
      <div class="rows">
        {#each data.recent as r (r.collection + r.id)}
          <a
            class="row"
            href="/admin/content/{r.collection}/{r.id}"
            style="grid-template-columns:minmax(0,1fr) 150px 120px"
          >
            <span class="name">{r.title}</span>
            <span class="cell hide-sm">{r.label}</span>
            <span class="cell num">{when(r.updated_at)}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>
