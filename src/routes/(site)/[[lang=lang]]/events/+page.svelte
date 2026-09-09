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
  import Img from '$lib/components/site/Img.svelte';
  import PageSections from '$lib/components/site/PageSections.svelte';
  import { sectionAt, extraSections } from '$lib/pages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');

  /* Copy for the fixed slots comes from the `events` page, addressed by
     anchor. A missing page or a missing slot falls back to the string that was
     hardcoded here, so the page never renders blank because nobody has filled
     the backoffice in yet. */
  const cfg = $derived(data.page);
  const slot = $derived((anchor: string, key: string, fallback: string) => {
    const v = sectionAt(cfg, anchor)?.content?.[key];
    return typeof v === 'string' && v.trim() ? v.trim() : fallback;
  });
  const SLOTS = ['upcoming', 'formats', 'alle', 'note', 'box-office', 'format-details'];

  /* The per-format detail sections are a `collection` slot on the events page.
     The words and images stay in Inhoud → Formats — they also feed the black
     strip above, and two copies of the same sentence drift apart — while the
     page decides whether the sections appear, on what ground, and how many.

     A configured page with no such slot means "do not show them". The fallback
     only applies when the page itself has not been configured, so an unseeded
     install still renders the site as it was. */
  const detailSlot = $derived(sectionAt(cfg, 'format-details'));
  const detailLimit = $derived.by(() => {
    const raw = String(detailSlot?.content?.limit ?? '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : Infinity;
  });
  const showDetails = $derived(cfg ? !!detailSlot : true);
  const detailBase = $derived(detailSlot?.ground ?? 'white');

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
  {#if cfg?.heroImage}
    <Img src={cfg.heroImage} alt={cfg.heroTitle} role="wide" />
  {/if}
  <div class="hero-content wrap">
    <div>
      <span class="label reveal">{cfg?.heroLabel || '[ Events ]'}</span>
      <h1 class="d-xl reveal">{cfg?.heroTitle || 'What can you experience?'}</h1>
      <p class="intro reveal">
        {cfg?.heroIntro ||
          (nl
            ? 'Formats zijn de soorten experiences die IMPACT bouwt. Events zijn de concrete edities waarvoor je je kan inschrijven.'
            : 'Formats are the kinds of experience IMPACT builds. Events are the concrete editions you can sign up for.')}
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
        <span class="running">{slot('upcoming', 'running', 'Upcoming IMPACT events')}</span>
        <h2 class="d-l">
          {slot('upcoming', 'heading', nl ? 'Wat kan je binnenkort meemaken?' : 'What is coming up?')}
        </h2>
      </div>
      <p class="body">
        {slot(
          'upcoming',
          'lead',
          nl
            ? 'Data en locaties worden bevestigd zodra de wachtlijst voldoende groot is.'
            : 'Dates and locations are confirmed once the waiting list is large enough.'
        )}
      </p>
    </div>

    {#each upcoming as e (e.id)}
      <div class="event-row">
        <a class="event-row-main" href={p(`/events/${e.id}`)}>
          <Img src={e.heroImage} alt={e.title} role="card" />
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
      {slot(
        'note',
        'body',
        nl
          ? 'Deze events staan nog niet vast: of een editie doorgaat, hangt af van het aantal inschrijvingen op de wachtlijst.'
          : 'These events are not fixed yet: whether an edition runs depends on how many people join the waiting list.'
      )}
    </p>

    <!-- Box office. The link is the page; boxoffice.js mounts the Ticket Tailor
         widget on top once marketing consent is given, so with no JavaScript,
         no consent or no account configured this still reaches the tickets. -->
    <div class="box-office" data-box-office>
      <p class="body">
        {slot(
          'box-office',
          'body',
          nl
            ? 'Tickets en inschrijvingen lopen via ons box office. Daar staan alle edities met hun actuele status.'
            : 'Tickets and registration run through our box office, with every edition and its current status.'
        )}
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
        <span class="running">{slot('formats', 'running', nl ? 'Onze formats' : 'Our formats')}</span>
        <h2 class="d-l align-right">
          {slot(
            'formats',
            'heading',
            nl ? 'Het medium verandert. De fundamenten blijven.' : 'The medium changes. The foundations stay.'
          )}
        </h2>
      </div>
      <p class="body">
        {slot(
          'formats',
          'lead',
          nl
            ? 'Elk format vertrekt van dezelfde zes fundamenten. Wat verandert, is de duur, de intensiteit en de leeftijdsgroep.'
            : 'Every format starts from the same six foundations.'
        )}
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

<!-- One section per format, alternating ground and image side, as on the site.
     Placement and ground come from the `format-details` slot; the content comes
     from the format records. -->
{#if showDetails}
  {#if detailSlot && (String(detailSlot.content?.running ?? '') || String(detailSlot.content?.heading ?? ''))}
    <section class="section">
      <div class="wrap">
        <div class="sec-head" data-reveal>
          <div>
            {#if String(detailSlot.content?.running ?? '')}
              <span class="running">{detailSlot.content.running}</span>
            {/if}
            {#if String(detailSlot.content?.heading ?? '')}
              <h2 class="d-l">{detailSlot.content.heading}</h2>
            {/if}
          </div>
          {#if String(detailSlot.content?.lead ?? '')}
            <p class="body">{detailSlot.content.lead}</p>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  {#each detailed.slice(0, detailLimit) as f, i (f.id)}
    {@const sand = detailBase === 'sand' ? i % 2 === 0 : i % 2 === 1}
    <section class="section" class:section--sand={sand} class:section--black={detailBase === 'black'} id={f.id}>
      <div class="wrap two-col two-col--media">
        {#if i % 2 === 1 && f.image}
          <Img src={f.image} alt={f.name} role="wide" style="width:100%;aspect-ratio:16/9;object-fit:cover" />
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
          <Img src={f.image} alt={f.name} role="wide" style="width:100%;aspect-ratio:16/9;object-fit:cover" />
        {/if}
      </div>
    </section>
  {/each}
{/if}

<!-- alle events -->
<section class="section" id="alle">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <div>
        <span class="running">{slot('alle', 'running', nl ? 'Alle events' : 'All events')}</span>
        <h2 class="d-l">{slot('alle', 'heading', nl ? 'Volledig overzicht' : 'Full overview')}</h2>
      </div>
      <p class="body">
        {slot(
          'alle',
          'lead',
          nl
            ? 'Afgelopen edities verhuizen naar Journal als recap, met foto\'s, aftermovie en verhalen.'
            : 'Past editions move to the Journal as a recap, with photos, aftermovie and stories.'
        )}
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

<!-- Sections added in the backoffice that are not one of the fixed slots.
     Rendering them means nothing anyone adds is silently ignored. -->
<PageSections sections={extraSections(cfg, SLOTS)} {nl} />
