<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const live = $derived(data.brevo.ok || data.tickets.ok);
</script>

<svelte:head><title>Signalen — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ Signalen ]</span>
    <h1 class="d-m">Inschrijvingen per editie</h1>
    <p class="body">
      Eén scherm dat drie systemen samenlegt: de edities uit deze backoffice, de
      inschrijvingen uit Brevo en de verkoop uit Ticket Tailor. Alleen lezen — Brevo houdt
      de lijst bij, Ticket Tailor de bestellingen, en geen van beide krijgt hier een tweede
      eigenaar.
    </p>
  </header>

  {#if !data.brevo.ok}
    <div class="notice notice--red">
      <strong>Brevo niet gelezen.</strong> {data.brevo.reason}
      {#if data.brevo.detail}<br /><span class="mono">{data.brevo.detail}</span>{/if}
      <br />Zet de sleutel in de omgeving van deze deploy — een nieuwe waarde telt pas na
      een nieuwe deploy.
    </div>
  {/if}

  {#if !data.tickets.ok}
    <div class="notice notice--red">
      <strong>Ticket Tailor niet gelezen.</strong> {data.tickets.reason}
      {#if data.tickets.detail}<br /><span class="mono">{data.tickets.detail}</span>{/if}
    </div>
  {/if}

  {#if live}
    <div class="tiles">
      <div class="tile">
        <div class="n">{data.totals.signups}</div>
        <div class="k">Contacten</div>
      </div>
      <div class="tile">
        <div class="n">{data.totals.newsletter}</div>
        <div class="k">Nieuwsbrief</div>
      </div>
      <div class="tile">
        <div class="n">{data.totals.waitlist}</div>
        <div class="k">Wachtlijst</div>
      </div>
    </div>
  {/if}

  <section style="margin-top:40px">
    <h2 class="h" style="margin-bottom:16px">Per editie</h2>

    {#if data.rows.length === 0}
      <div class="empty">
        <span class="label">[ Leeg ]</span>
        <p class="body">Nog geen edities in de backoffice om tegen te leggen.</p>
      </div>
    {:else}
      <div class="rows">
        <div class="row" style="grid-template-columns:minmax(0,1.6fr) 140px 110px 110px 150px">
          <span class="label">Editie</span>
          <span class="label hide-sm">Status</span>
          <span class="label hide-sm">Wachtlijst</span>
          <span class="label hide-sm">NL / EN</span>
          <span class="label hide-sm">Ticket Tailor</span>
        </div>

        {#each data.rows as r (r.id)}
          <div class="row" style="grid-template-columns:minmax(0,1.6fr) 140px 110px 110px 150px">
            <span class="name">
              <a href="/content/events/{r.id}">{r.title}</a>
              <span class="meta" style="display:block;font-weight:400">{r.dateText}</span>
            </span>
            <span class="cell hide-sm"><Badge kind="status" value={r.status} /></span>
            <span class="cell num hide-sm">{r.signups}</span>
            <span class="cell num hide-sm">{r.nl} / {r.en}</span>
            <span class="cell hide-sm">
              {#if r.ticketTailor}
                {r.ticketTailor.sold ?? '—'} verkocht
              {:else}
                <span class="meta">geen event</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>

      <p class="meta" style="margin-top:14px">
        Ticket Tailor koppelt op de naam van het event. Geen event betekent dat de editie
        daar nog niet is aangemaakt — dat is een taak van de klant, geen fout.
      </p>
    {/if}
  </section>

  {#if data.orphans.length}
    <section style="margin-top:40px">
      <h2 class="h" style="margin-bottom:6px">Inschrijvingen zonder editie</h2>
      <p class="body" style="margin-bottom:16px;max-width:64ch">
        Deze contacten dragen een EVENT-waarde die bij geen enkele editie hoort. Ze vallen
        buiten het segment als de inschrijvingen opengaan.
      </p>
      <div class="rows">
        {#each data.orphans as o (o.event)}
          <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
            <span class="name mono">{o.event}</span>
            <span class="cell num">{o.total}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if data.sources.length}
    <section style="margin-top:40px">
      <h2 class="h" style="margin-bottom:6px">Wat de inschrijving opleverde</h2>
      <p class="body" style="margin-bottom:16px;max-width:64ch">
        Campagne waar die er is, anders de bron. Dit is het deel van de briefing dat vraagt
        welke campagne of pagina elke inschrijving heeft opgeleverd.
      </p>
      <div class="rows">
        {#each data.sources as s (s.source)}
          <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
            <span class="name">{s.source}</span>
            <span class="cell num">{s.total}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
