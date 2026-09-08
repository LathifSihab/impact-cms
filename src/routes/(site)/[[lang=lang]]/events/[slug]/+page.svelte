<script lang="ts">
  /**
   * /events/<slug> — site/event.html, once per edition.
   *
   * The static file is a single hardcoded page for Basketball Edition 2027 and
   * all nine links on its events list point at it, so every edition shows the
   * same page. This is the same markup driven by the record, which is the thing
   * the brief asked for and never got.
   *
   * Sections, classes and order are transcribed from that file: hero--event,
   * metabar, event-body with a sticky-col, day-row, fund-grid, expert-grid,
   * details.faq, gallery, band, news-band.
   */
  import { imageUrl, path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const nl = $derived(data.locale === 'nl');
  const e = $derived(data.event);
  const ext = $derived((f: string) => {
    const base = (data.staticBase ?? '').replace(/\/$/, '');
    return base ? `${base}${nl ? '' : '/en'}/${f}` : `/${f}`;
  });

  const statusLabel = $derived(t(`status.${e.status}` as 'status.waitlist'));

  /** The metabar pairs, from the record; only rows with a value are shown. */
  const pairs = $derived(
    [
      e.formatName ? { k: t('event.format'), v: e.formatName } : null,
      { k: t('event.when'), v: e.dateText },
      { k: t('event.location'), v: e.location },
      { k: t('event.age'), v: `${e.ageMin}–${e.ageMax} ${t('event.years')}` },
      e.price ? { k: t('event.price'), v: e.price } : null,
      e.capacity ? { k: t('event.capacity'), v: String(e.capacity) } : null
    ].filter(Boolean) as { k: string; v: string }[]
  );

  const practical = $derived(
    e.practical.length ? e.practical.map((r) => ({ k: r.k, v: r.v })) : pairs
  );
</script>

<svelte:head>
  <title>{e.seo.title || `${e.title} | IMPACT`}</title>
  <meta name="description" content={e.seo.description || e.standfirst} />
</svelte:head>

<header class="hero hero--event" data-reveal-root>
  {#if e.heroImage}
    <img src={imageUrl(e.heroImage)} alt={e.title} />
  {/if}
  <div class="hero-content wrap">
    <div class="pills reveal">
      {#if e.formatName}<span class="pill pill--static is-red">{e.formatName}</span>{/if}
      <span class="pill pill--static">{e.ageMin}–{e.ageMax} {t('event.years')}</span>
      <span class="pill pill--static">{statusLabel}</span>
    </div>
    {#if e.formatName}
      <div class="kicker reveal">IMPACT <span class="red">[{e.formatName}]</span></div>
    {/if}
    <h1 class="d-xl reveal">{e.title}</h1>
    <p class="stand reveal">{e.standfirst}</p>
  </div>
</header>

<div class="metabar">
  <div class="wrap">
    <div class="pairs">
      {#each pairs as pair (pair.k)}
        <div><div class="k">{pair.k}</div><div class="v">{pair.v}</div></div>
      {/each}
    </div>
    {#if e.status === 'waitlist'}
      <a href="#wachtlijst" class="pill pill--primary">{t('wl.submit')}</a>
    {:else if e.status === 'open' && data.boxOffice}
      <a href={data.boxOffice} class="pill pill--primary" target="_blank" rel="noopener">
        {t('open.cta')}
      </a>
    {/if}
  </div>
</div>

<div class="wrap event-body">
  <div>
    <section>
      <span class="running">{nl ? 'Wat is het' : 'What it is'}</span>
      <h2 style="margin-top:22px">{e.standfirst}</h2>
      <p class="intro">{e.intro}</p>
    </section>

    {#if e.programmeDays.length}
      <section>
        <span class="running">{t('event.programme')}</span>
        <div style="margin-top:26px">
          {#each e.programmeDays as d (d.day + d.title)}
            <div class="day-row">
              <div class="d">{d.day}</div>
              <div>
                <h3>{d.title}</h3>
                <p class="body">{d.body}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if e.foundations.length}
      <section>
        <span class="running">{nl ? 'Welke fundamenten' : 'Which foundations'}</span>
        <div class="fund-grid" style="margin-top:26px">
          {#each e.foundations as f (f.id)}
            <div class="fund-cell">
              <div class="n">{f.number}</div>
              <h3>{f.name}</h3>
              <p class="body">{f.enOneLiner}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if e.experts.length}
      <!-- Only confirmed experts reach this page: the anon policy on `experts`
           filters on `confirmed`, so an unapproved name cannot render even if
           this template forgot to check. -->
      <section id="experts">
        <span class="running">{t('event.experts')}</span>
        <p class="body" style="max-width:620px;margin:16px 0 26px">
          {nl
            ? 'Deze editie wordt begeleid door ons kernteam van experts, elk verbonden aan één of meerdere fundamenten.'
            : 'This edition is guided by our core team of experts, each tied to one or more foundations.'}
        </p>
        <div class="expert-grid">
          {#each e.experts as x (x.id)}
            <article class="expert">
              <h4>{x.name}</h4>
              <p class="org">{x.org}</p>
              {#if x.bio}<p class="r">{x.bio}</p>{/if}
            </article>
          {/each}
        </div>
      </section>
    {/if}

    {#if e.faq.length}
      <section>
        <span class="running">{t('event.faq')}</span>
        <div style="margin-top:26px">
          {#each e.faq as f (f.q)}
            <details class="faq">
              <summary>{f.q}<span class="plus">+</span></summary>
              <p class="a body">{f.a}</p>
            </details>
          {/each}
        </div>
      </section>
    {/if}
  </div>

  <aside class="sticky-col" id="wachtlijst">
    <div class="wl-card">
      {#if e.status === 'waitlist'}
        <span class="running">{nl ? 'Wachtlijst' : 'Waiting list'}</span>
        <h2 style="margin-top:16px">
          {nl ? 'Deze editie is nog niet bevestigd' : 'This edition is not confirmed yet'}
        </h2>
        <p class="body">{t('wl.body')}</p>

        {#if data.subscribeEndpoint}
          <!-- Posts to the live Netlify function. 04-INTEGRATIONS.md is explicit
               that endpoint keeps running where it is and must not be rebuilt. -->
          <form
            id="waitlist-form"
            data-age-min={e.ageMin}
            data-age-max={e.ageMax}
            novalidate
            name="waitlist"
            method="POST"
            action={data.subscribeEndpoint}
          >
            <input type="hidden" name="form-name" value="waitlist" />
            <input type="hidden" name="bot-field" />
            <input type="hidden" name="event" value={e.id} />
            <input type="hidden" name="ageMin" value={e.ageMin} />
            <input type="hidden" name="ageMax" value={e.ageMax} />
            <input type="hidden" name="locale" value={data.locale} />

            <div class="field">
              <label for="naam">{t('wl.name')}</label>
              <input id="naam" name="naam" type="text" autocomplete="given-name" />
              <span class="err" role="alert"></span>
            </div>
            <div class="field">
              <label for="leeftijd">{t('wl.age')}</label>
              <input id="leeftijd" name="leeftijd" type="number" inputmode="numeric" min={e.ageMin} max={e.ageMax} />
              <span class="err" role="alert"></span>
            </div>
            <div class="field">
              <label for="email">{t('wl.email')}</label>
              <input id="email" name="email" type="email" autocomplete="email" />
              <span class="err" role="alert"></span>
            </div>
            <div class="field">
              <label for="gemeente">{t('wl.town')}</label>
              <input id="gemeente" name="gemeente" type="text" />
              <span class="err" role="alert"></span>
            </div>

            <!-- The guardian tick is the lawful basis for holding a child's first
                 name and age. The browser check is a courtesy; the endpoint
                 re-checks server-side, and a version that did not was a defect. -->
            <div class="field field--check">
              <input type="checkbox" id="wl-consent" name="consent" value="ja" />
              <label for="wl-consent">{t('wl.consent')}</label>
              <span class="err" role="alert"></span>
            </div>

            <button type="submit" class="pill pill--primary">{t('wl.submit')}</button>
          </form>
        {:else}
          <p class="meta" style="margin-top:18px">{t('wl.unavailable')}</p>
        {/if}

        <p class="meta" style="margin-top:18px">
          {nl ? 'Heb je financiële ondersteuning nodig? Ontdek' : 'Need financial support? Discover'}
          <a href={ext('social-impact.html')} style="color:var(--red);font-weight:600">IMPACT FOR ALL</a>.
        </p>
      {:else if e.status === 'open'}
        <span class="running">{statusLabel}</span>
        <h2 style="margin-top:16px">{t('open.body')}</h2>
        {#if data.boxOffice}
          <a class="pill pill--primary" style="margin-top:18px" href={data.boxOffice} target="_blank" rel="noopener">
            {t('open.cta')}
          </a>
        {/if}
      {:else if e.status === 'full'}
        <span class="running">{statusLabel}</span>
        <h2 style="margin-top:16px">{t('full.body')}</h2>
      {:else}
        <span class="running">{statusLabel}</span>
        <h2 style="margin-top:16px">{t('past.body')}</h2>
        <a class="pill pill--secondary" style="margin-top:18px" href={p('/journal')}>{t('nav.journal')}</a>
      {/if}
    </div>

    <div class="practical">
      <span class="running">{t('event.practical')}</span>
      <div style="margin-top:18px">
        {#each practical as row (row.k)}
          <div class="row"><span>{row.k}</span><span>{row.v}</span></div>
        {/each}
      </div>
    </div>
  </aside>
</div>

{#if e.gallery.length}
  <section class="section section--sand">
    <div class="wrap">
      <div class="sec-head" data-reveal>
        <div>
          <span class="running">{t('event.gallery')}</span>
          <h2 class="d-l">{e.title}</h2>
        </div>
      </div>
      <div class="gallery">
        {#each e.gallery as g (g.src)}
          <img src={imageUrl(g.src)} alt={g.alt} loading="lazy" />
        {/each}
      </div>
    </div>
  </section>
{/if}

{#if e.partners.length}
  <section class="section">
    <div class="wrap">
      <span class="running">{t('event.partners')}</span>
      <div class="logos" style="margin-top:26px">
        {#each e.partners as pt (pt.id)}
          <a href={pt.url} target="_blank" rel="noopener">
            <img src={imageUrl(pt.logo)} alt={pt.name} loading="lazy" />
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}

<section class="band" id="contact">
  <div class="wrap">
    <div>
      <span class="running">{nl ? 'Contact' : 'Contact'}</span>
      <h2 class="d-l d-l--44">
        {nl ? 'Nog vragen over deze editie?' : 'Questions about this edition?'}
      </h2>
    </div>
    <a class="pill pill--ghost" href={ext('contact.html')}>{nl ? 'Neem contact op' : 'Get in touch'}</a>
  </div>
</section>

<section class="news-band">
  <div class="wrap">
    <h2 class="d-l d-l--40" style="margin:16px 0 12px">
      {nl ? 'Blijf op de hoogte' : 'Join the IMPACT community'}
    </h2>
    <p class="body">
      {nl
        ? 'Nieuwe events, verhalen en partnerships. Eén mail per maand.'
        : 'New events, stories and partnerships. One mail a month.'}
    </p>
    <form class="news-form" data-newsletter novalidate name="newsletter" action="/">
      <input type="hidden" name="form-name" value="newsletter" />
      <input type="hidden" name="bot-field" />
      <div class="field-row">
        <label class="sr-only" for="e-news">E-mail</label>
        <input id="e-news" name="email" type="email" placeholder={nl ? 'jouw e-mailadres' : 'your email address'} required />
        <button type="submit" class="pill pill--primary pill--sm">{nl ? 'Inschrijven' : 'Subscribe'}</button>
      </div>
      <p class="form-msg" role="status"></p>
    </form>
  </div>
</section>
