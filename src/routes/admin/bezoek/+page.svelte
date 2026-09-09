<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bezoek — IMPACT</title></svelte:head>

<div class="page">
  <header class="head">
    <h1 class="h1">Bezoek</h1>
    <p class="body">
      Plausible, hier ingebouwd — dezelfde cijfers als op plausible.io, zonder de site te
      verlaten. Bezoekers, herkomst, populairste pagina's en de doelen die het formulier
      afvuurt.
    </p>
    <p class="body" style="margin-top:10px">
      Wat Plausible <em>niet</em> weet, staat op
      <a href="/admin/signalen">Signalen</a>: welke campagne elke inschrijving opleverde.
      Dat komt uit onze eigen gegevens, niet uit het bezoek.
    </p>
  </header>

  {#if data.configured}
    <!-- Plausible's shared dashboards are built to be framed; loading="lazy"
         keeps the request off the critical path of every admin page load. -->
    <iframe
      title="Plausible — bezoekcijfers"
      src={data.url}
      loading="lazy"
      scrolling="no"
      frameborder="0"
    ></iframe>
    <p class="meta">
      Ververst zichzelf niet automatisch — herlaad de pagina voor de laatste stand.
    </p>
  {:else}
    <div class="setup">
      <p class="note"><strong>{data.reason}</strong></p>
      <p class="body">
        Deze pagina toont het Plausible-dashboard zodra er een gedeelde link is. Zo maak
        je die:
      </p>
      <ol class="body">
        <li>Plausible → <strong>Site settings → Shared links</strong> → <em>New shared link</em>.</li>
        <li>Laat het wachtwoordveld leeg. Deze pagina zit al achter de login van de
          backoffice; een tweede wachtwoord zou elke sessie opnieuw gevraagd worden.</li>
        <li>Kopieer de link — die ziet eruit als
          <span class="mono">https://plausible.io/share/…?auth=…</span></li>
        <li>Zet hem als <span class="mono">PLAUSIBLE_SHARED_LINK</span> en deploy opnieuw:</li>
      </ol>
      <pre class="mono">vercel env add PLAUSIBLE_SHARED_LINK production --type secret --value "&lt;link&gt;" --force --yes
vercel deploy --prod --yes</pre>
      <p class="meta">
        Iedereen die de link heeft, kan de bezoekcijfers lezen. Er staan geen
        persoonsgegevens in — Plausible bewaart die niet — maar deel hem niet breder dan
        nodig.
      </p>
    </div>
  {/if}
</div>

<style>
  .head {
    max-width: 64ch;
    margin-bottom: 28px;
  }
  iframe {
    width: 100%;
    /* Plausible's dashboard is tall and cannot resize its own frame from
       another origin, so the height is ours to choose. This clears the graph,
       the source and page tables and the goals without an inner scrollbar. */
    height: 1750px;
    border: 1px solid var(--border, #e5e5e5);
    border-radius: 10px;
    background: #fff;
    display: block;
  }
  .meta {
    margin-top: 12px;
    font-size: 12px;
    color: var(--grey-muted, #767676);
  }
  .setup {
    max-width: 72ch;
  }
  .setup ol {
    margin: 14px 0 18px 20px;
  }
  .setup li {
    margin-bottom: 8px;
  }
  pre.mono {
    background: #f6f6f6;
    border: 1px solid var(--border, #e5e5e5);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  @media (max-width: 820px) {
    iframe {
      height: 2100px;
    }
  }
</style>
