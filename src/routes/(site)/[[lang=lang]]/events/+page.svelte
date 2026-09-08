<script lang="ts">
  /**
   * /events — the same page as site/events.html, with the lists coming from the
   * database instead of being written into the HTML.
   *
   * Markup, classes and section order are transcribed from that file so the
   * stylesheet does the work it was built for. What changed is where the content
   * comes from:
   *
   *   upcoming rows   <- events where status is not 'past'
   *   format strip    <- formats, ordered
   *   format sections <- formats with a body
   *   overview table  <- every event
   *
   * The prose around them — the hero copy, the section leads, the note, the CTA
   * cards — is hand-authored on the static site and has no content type behind
   * it, so it is reproduced here as written.
   */
  import { imageUrl, path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');

  const upcoming = $derived(data.events.filter((e) => e.status !== 'past'));
  /** Sections exist only for formats with body copy; Hosted links out instead. */
  const detailed = $derived(data.formats.filter((f) => f.body && !f.isHosted));

  const statusLabel = (s: string) => t(`status.${s}` as 'status.waitlist');
  /** The overview table's status classes, matching the static markup. */
  const statusClass = (s: string) => (s === 'past' ? 'st st--past' : s === 'waitlist' || s === 'open' ? 'st st--open' : 'st');

  const ctaLabel = (s: string) =>
    s === 'open'
      ? nl
        ? 'Bekijk tickets'
        : 'View tickets'
      : s === 'waitlist'
        ? nl
          ? 'Zet me op de wachtlijst'
          : 'Join the waiting list'
        : nl
          ? 'Bekijk editie'
          : 'View edition';
</script>

<svelte:head>
  <title>{nl ? 'Events' : 'Events'} | IMPACT</title>
  <meta name="description" content={t('events.lead')} />
</svelte:head>

<header class="hero hero--page" data-reveal-root>
  <div class="hero-content wrap">
    <div>
      <span class="label reveal">[ Events ]</span>
      <h1 class="d-xl reveal">What can you experience?</h1>
      <p class="intro reveal">
        {#if nl}
          Formats zijn de soorten experiences die IMPACT bouwt. Events zijn de concrete edities
          waarvoor je je kan inschrijven. Hieronder eerst wat eraan komt, daarna waarin we werken.
        {:else}
          Formats are the kinds of experience IMPACT builds. Events are the concrete editions you
          can sign up for. Below: first what is coming, then what we work in.
        {/if}
      </p>
      <nav class="anchor-nav reveal" aria-label="Secties op deze pagina">
        <a href="#upcoming">{nl ? 'Upcoming events' : 'Upcoming events'}</a>
        <a href="#formats">{nl ? 'Onze formats' : 'Our formats'}</a>
        <a href="#alle">{nl ? 'Alle events' : 'All events'}</a>
      </nav>
    </div>
  </div>
</header>

<!-- upcoming -->
<section class="section" id="upcoming">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <div>
        <span class="running">Upcoming IMPACT events</span>
        <h2 class="d-l">{nl ? 'Wat kan je binnenkort meemaken?' : 'What is coming up?'}</h2>
      </div>
      <p class="body">
        {#if nl}
          Data en locaties worden bevestigd zodra de wachtlijst voldoende groot is. Inschrijven op
          de wachtlijst is gratis en verplicht je tot niets.
        {:else}
          Dates and locations are confirmed once the waiting list is large enough. Joining it is
          free and commits you to nothing.
        {/if}
      </p>
    </div>

    {#each upcoming as e (e.id)}
      <div class="event-row">
        <a class="event-row-main" href={p(`/events/${e.id}`)}>
          <img src={imageUrl(e.heroImage)} alt={e.title} />
          <div>
            <span class="tag">{e.formatName ?? ''}</span>
            {#if e.price}<span class="tag tag--dim">{e.price}</span>{/if}
            <h3>{e.title}</h3>
          </div>
          <div class="when meta"><strong>{e.dateText}</strong>{e.location}</div>
          <div class="age meta">{e.ageMin}–{e.ageMax} {t('event.years')}</div>
        </a>
        <div class="cta">
          <a class="pill pill--secondary pill--sm" href={p(`/events/${e.id}`) + '#wachtlijst'}>
            {ctaLabel(e.status)}
          </a>
          <span class="status">{statusLabel(e.status)}</span>
        </div>
      </div>
    {:else}
      <p class="note body">{t('events.empty')}</p>
    {/each}

    <p class="note body">
      {#if nl}
        Deze events staan nog niet vast: of een editie doorgaat, hangt af van het aantal
        inschrijvingen op de wachtlijst.
      {:else}
        These events are not fixed yet: whether an edition runs depends on how many people join
        the waiting list.
      {/if}
    </p>

    <!-- Box office. The link is the page; boxoffice.js mounts the Ticket Tailor
         widget on top once marketing consent is given, so with no JavaScript,
         no consent or no account configured this still reaches the tickets. -->
    <div class="box-office" data-box-office>
      <p class="body">
        {#if nl}
          Tickets en inschrijvingen lopen via ons box office. Daar staan alle edities met hun
          actuele status.
        {:else}
          Tickets and registration run through our box office, with every edition and its current
          status.
        {/if}
      </p>
      <a
        class="pill pill--primary"
        data-box-office-link
        href={data.boxOffice || 'https://www.tickettailor.com/'}
        target="_blank"
        rel="noopener"
      >
        {nl ? 'Bekijk alle tickets' : 'View all tickets'}
      </a>
    </div>
  </div>
</section>

<!-- formats -->
<section class="section section--black" id="formats">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <div>
        <span class="running">{nl ? 'Onze formats' : 'Our formats'}</span>
        <h2 class="d-l align-right">
          {nl
            ? 'Het medium verandert. De fundamenten blijven.'
            : 'The medium changes. The foundations stay.'}
        </h2>
      </div>
      <p class="body">
        {#if nl}
          Elk format vertrekt van dezelfde zes fundamenten. Wat verandert, is de duur, de
          intensiteit en de leeftijdsgroep.
        {:else}
          Every format starts from the same six foundations. What changes is duration, intensity
          and age group.
        {/if}
      </p>
    </div>

    {#each data.formats as f, i (f.id)}
      <a class="format-row" class:format-row--hosted={f.isHosted} href={f.isHosted ? '#alle' : `#${f.id}`}>
        <span class="n">{f.isHosted ? '—' : String(i + 1).padStart(2, '0')}</span>
        <span class="name">IMPACT <span class="red">{f.bracketName}</span></span>
        <p class="body desc">{f.description}</p>
        <span class="m">{f.meta}</span>
      </a>
    {/each}
  </div>
</section>

<!-- one section per format, alternating ground and image side, as on the site -->
{#each detailed as f, i (f.id)}
  <section class="section" class:section--sand={i % 2 === 1} id={f.id}>
    <div class="wrap two-col two-col--media">
      {#if i % 2 === 1 && f.image}
        <img src={imageUrl(f.image)} alt={f.name} style="width:100%;aspect-ratio:16/9;object-fit:cover" />
      {/if}
      <div>
        <span class="running">Format {String(i + 1).padStart(2, '0')}</span>
        <h2 class="d-l" style="margin:22px 0 24px">IMPACT <span class="red">{f.bracketName}</span></h2>
        <p class="intro">{f.description}</p>
        {#if f.ticks.length}
          <ul class="ticks">
            {#each f.ticks as tick (tick)}<li>{tick}</li>{/each}
          </ul>
        {/if}
        {#if f.body}<p class="body" style="margin-top:24px">{f.body}</p>{/if}
      </div>
      {#if i % 2 === 0 && f.image}
        <img src={imageUrl(f.image)} alt={f.name} style="width:100%;aspect-ratio:16/9;object-fit:cover" />
      {/if}
    </div>
  </section>
{/each}

<!-- alle events -->
<section class="section" id="alle">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <div>
        <span class="running">{nl ? 'Alle events' : 'All events'}</span>
        <h2 class="d-l">{nl ? 'Volledig overzicht' : 'Full overview'}</h2>
      </div>
      <p class="body">
        {#if nl}
          Afgelopen edities blijven niet tussen de actieve events staan: ze verhuizen naar Journal
          als recap, met foto's, aftermovie en verhalen.
        {:else}
          Past editions do not stay among the active ones: they move to the Journal as a recap,
          with photos, aftermovie and stories.
        {/if}
      </p>
    </div>

    <div class="table">
      <div class="table-head">
        <span>Event</span><span>Format</span><span>{nl ? 'Datum' : 'Date'}</span>
        <span>{nl ? 'Leeftijd' : 'Age'}</span><span>Status</span>
      </div>
      {#each data.events as e (e.id)}
        <a class="table-row" href={p(`/events/${e.id}`)}>
          <span>{e.title}</span>
          <span>{e.formatName ?? ''}</span>
          <span>{e.dateText}</span>
          <span>{e.ageMin}–{e.ageMax}</span>
          <span class={statusClass(e.status)}>{statusLabel(e.status)}</span>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="cta-cards">
  <div class="cta-card cta-card--ink">
    <h3>{nl ? 'Zet je op de wachtlijst' : 'Join the waiting list'}</h3>
    <p>
      {nl
        ? 'Gratis, zonder verplichting. Je hoort als eerste wanneer een editie opengaat.'
        : 'Free, no commitment. You hear first when an edition opens.'}
    </p>
    <a class="pill pill--ghost" href="#upcoming">{nl ? 'Bekijk events' : 'View events'}</a>
  </div>
  <div class="cta-card cta-card--red">
    <h3>{nl ? 'Blijf op de hoogte' : 'Stay in the loop'}</h3>
    <p>{nl ? 'Nieuwe events zodra ze bevestigd zijn.' : 'New events as soon as they are confirmed.'}</p>
    <form class="news-form" data-newsletter novalidate name="newsletter" action="/">
      <input type="hidden" name="form-name" value="newsletter" />
      <input type="hidden" name="bot-field" />
      <div class="field-row">
        <label class="sr-only" for="cta-news">E-mail</label>
        <input id="cta-news" name="email" type="email" placeholder={nl ? 'jouw e-mailadres' : 'your email address'} required />
        <button type="submit" class="pill pill--primary pill--sm">{nl ? 'Inschrijven' : 'Subscribe'}</button>
      </div>
      <p class="form-msg" role="status"></p>
    </form>
  </div>
  <div class="cta-card cta-card--burgundy">
    <h3>{nl ? 'Iets samen bouwen' : 'Build something together'}</h3>
    <p>
      {nl
        ? 'Clubs, scholen en organisaties bouwen met ons een experience op maat.'
        : 'Clubs, schools and organisations build a bespoke experience with us.'}
    </p>
    <a class="pill pill--ghost" href="#alle">Hosted Experiences</a>
  </div>
</section>
