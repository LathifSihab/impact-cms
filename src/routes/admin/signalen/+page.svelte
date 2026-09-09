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
              <a href="/admin/content/events/{r.id}">{r.title}</a>
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

  <!-- Tier 4: traffic and conversion. Two sources on purpose — Plausible knows
       how many came, our own receipts know what each one arrived through. -->
  <section style="margin-top:48px">
    <h2 class="h" style="margin-bottom:6px">Verkeer en conversie</h2>
    <p class="body" style="margin-bottom:16px;max-width:64ch">
      Bezoek uit Plausible, herkomst uit onze eigen inschrijvingen. Die tweede helft
      heeft geen sleutel nodig: sinds het formulier hier binnenkomt, staat bij elke
      inschrijving de pagina, de verwijzer en de campagne waarlangs ze kwam.
    </p>

    {#if !data.trafficState.ok}
      <p class="note" style="margin-bottom:20px">
        <strong>Bezoekcijfers niet gelezen.</strong>
        {data.trafficState.reason}
        {#if data.trafficState.detail}<span class="mono"> ({data.trafficState.detail})</span>{/if}
      </p>
    {:else}
      <div class="rows" style="margin-bottom:24px">
        <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
          <span class="name">Bezoekers, 30 dagen</span>
          <span class="cell num">{data.traffic.visitors}</span>
        </div>
        <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
          <span class="name">Paginaweergaven</span>
          <span class="cell num">{data.traffic.pageviews}</span>
        </div>
        {#if data.conversion !== null}
          <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
            <span class="name">Inschrijvingen per bezoeker</span>
            <span class="cell num">{data.conversion}%</span>
          </div>
        {/if}
      </div>

      {#if data.traffic.sources.length}
        <h3 class="h" style="margin:24px 0 10px">Waar bezoekers vandaan komen</h3>
        <div class="rows">
          {#each data.traffic.sources as s (s.source)}
            <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
              <span class="name">{s.source}</span>
              <span class="cell num">{s.visitors}</span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if !data.attributionState.ok}
      <p class="note">
        <strong>Eigen inschrijvingen niet gelezen.</strong>
        {data.attributionState.reason}
        {#if data.attributionState.detail}<span class="mono"> ({data.attributionState.detail})</span>{/if}
      </p>
    {:else}
      <h3 class="h" style="margin:32px 0 10px">Onze eigen inschrijvingen, 90 dagen</h3>
      <div class="rows">
        <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
          <span class="name">Totaal</span>
          <span class="cell num">{data.attribution.total}</span>
        </div>
        <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
          <span class="name">Nieuwsbrief</span>
          <span class="cell num">{data.attribution.newsletter}</span>
        </div>
        <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
          <span class="name">Wachtlijst</span>
          <span class="cell num">{data.attribution.waitlist}</span>
        </div>
      </div>

      {#if data.attribution.undelivered > 0}
        <!-- Not lost: recorded here, but Brevo did not take it. Worth acting on. -->
        <p class="note" style="margin-top:16px">
          <strong>{data.attribution.undelivered} inschrijving(en) niet bij Brevo aangekomen.</strong>
          Ze staan wel hier, dus er is niets weg — maar ze zitten nog niet in een lijst en
          moeten opnieuw aangeboden worden.
        </p>
      {/if}

      {#if data.attribution.campaigns.length}
        <h3 class="h" style="margin:28px 0 10px">Welke campagne het opleverde</h3>
        <div class="rows">
          {#each data.attribution.campaigns as c (c.label)}
            <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
              <span class="name">{c.label}</span>
              <span class="cell num">{c.total}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if data.attribution.landings.length}
        <h3 class="h" style="margin:28px 0 10px">Op welke pagina ze binnenkwamen</h3>
        <div class="rows">
          {#each data.attribution.landings as l (l.label)}
            <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
              <span class="name mono">{l.label}</span>
              <span class="cell num">{l.total}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if data.attribution.referrers.length}
        <h3 class="h" style="margin:28px 0 10px">Waarlangs ze binnenkwamen</h3>
        <div class="rows">
          {#each data.attribution.referrers as r (r.label)}
            <div class="row" style="grid-template-columns:minmax(0,1fr) 110px">
              <span class="name">{r.label}</span>
              <span class="cell num">{r.total}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if data.attribution.recent.length}
        <h3 class="h" style="margin:28px 0 10px">Laatste inschrijvingen</h3>
        <div class="rows">
          {#each data.attribution.recent as r (r.at)}
            <div class="row" style="grid-template-columns:150px 110px minmax(0,1fr) 90px">
              <span class="name mono">{r.at.slice(0, 16).replace('T', ' ')}</span>
              <span class="cell">{r.form}</span>
              <span class="cell">{r.event || r.campaign || '—'}</span>
              <span class="cell">
                {#if r.delivered === false}
                  <Badge kind="consent" value={false} no="niet bij Brevo" />
                {:else}{r.locale}{/if}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</div>
