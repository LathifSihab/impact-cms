<script lang="ts">
  /**
   * The per-edition page.
   *
   * This is the one the brief actually asked for and the static site never had:
   * `site/event.html` is a single hardcoded page for Basketball Edition 2027, and
   * all nine links on the events list point at it. Here every edition has its own
   * URL, rendered from its own row, and adding one needs no rebuild.
   */
  import { path, translator } from '$lib/i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const t = $derived(translator(data.locale));
  const p = $derived((rest: string) => path(data.locale, rest));
  const e = $derived(data.event);

  /* The sidebar rows are authored per event, but an edition with none should
     still show the basics rather than an empty box. */
  const practical = $derived(
    e.practical.length
      ? e.practical
      : [
          e.formatName ? { k: t('event.format'), v: e.formatName } : null,
          { k: t('event.age'), v: `${e.ageMin}–${e.ageMax} ${t('event.years')}` },
          { k: t('event.location'), v: e.location },
          e.price ? { k: t('event.price'), v: e.price } : null,
          e.capacity ? { k: t('event.capacity'), v: String(e.capacity) } : null
        ].filter(Boolean as unknown as (v: unknown) => v is { k: string; v: string })
  );
</script>

<svelte:head>
  <title>{e.seo.title || `${e.title} | IMPACT`}</title>
  <meta name="description" content={e.seo.description || e.standfirst} />
</svelte:head>

<section class="section" style="padding-bottom:48px">
  <div class="wrap">
    <a class="meta" href={p('/events')}>← {t('event.back')}</a>

    <div style="margin-top:24px">
      <span class="tag">{e.formatName ?? ''}</span>
      <span class="tag tag--dim">{t(`status.${e.status}` as 'status.waitlist')}</span>
    </div>

    <h1 class="d-l" style="margin:16px 0 20px">{e.title}</h1>
    <p class="intro" style="max-width:64ch">{e.standfirst}</p>

    <div class="meta" style="margin-top:24px">
      <strong>{e.dateText}</strong> · {e.location} · {e.ageMin}–{e.ageMax}
      {t('event.years')}
    </div>
  </div>
</section>

<section class="section section--sand" style="padding-top:56px">
  <div class="wrap" style="display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:56px;align-items:start">
    <div>
      <span class="label">[ {t('event.about')} ]</span>
      <p class="body" style="margin-top:16px;font-size:16px">{e.intro}</p>

      {#if e.programmeDays.length}
        <h2 class="h" style="margin:56px 0 18px">{t('event.programme')}</h2>
        <div class="practical" style="background:var(--white)">
          {#each e.programmeDays as d (d.day + d.title)}
            <div style="padding:16px 0;border-top:1px solid var(--border)">
              <span class="tag">{d.day}</span>
              <h3 style="font-size:18px;font-weight:700;margin:6px 0 6px">{d.title}</h3>
              <p class="body">{d.body}</p>
            </div>
          {/each}
        </div>
      {/if}

      {#if e.foundations.length}
        <h2 class="h" style="margin:56px 0 18px">{t('event.foundations')}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px">
          {#each e.foundations as f (f.id)}
            <div style="background:var(--white);padding:22px">
              <span class="tag">{f.number}</span>
              <h3 style="font-size:17px;font-weight:700;margin:8px 0 6px">{f.name}</h3>
              <p class="body" style="font-size:14px">{f.enOneLiner}</p>
            </div>
          {/each}
        </div>
      {/if}

      {#if e.experts.length}
        <!-- Only confirmed experts can reach this page: the anon RLS policy on
             `experts` filters on `confirmed`, so an unapproved name cannot be
             rendered even if this template forgot to check. -->
        <h2 class="h" style="margin:56px 0 18px">{t('event.experts')}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
          {#each e.experts as x (x.id)}
            <div style="background:var(--white);padding:22px">
              <h3 style="font-size:17px;font-weight:700">{x.name}</h3>
              <span class="tag tag--dim">{x.org}</span>
              {#if x.bio}<p class="body" style="font-size:14px;margin-top:10px">{x.bio}</p>{/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if e.gallery.length}
        <h2 class="h" style="margin:56px 0 18px">{t('event.gallery')}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          {#each e.gallery as g (g.src)}
            <figure style="margin:0">
              <img src="/{g.src}" alt={g.alt} loading="lazy" style="aspect-ratio:16/9;object-fit:cover;background:var(--placeholder)" />
              <figcaption class="meta" style="font-size:12px;margin-top:6px">{g.alt}</figcaption>
            </figure>
          {/each}
        </div>
      {/if}

      {#if e.faq.length}
        <h2 class="h" style="margin:56px 0 18px">{t('event.faq')}</h2>
        {#each e.faq as f (f.q)}
          <details style="border-top:1px solid var(--border-sand);padding:16px 0">
            <summary style="cursor:pointer;font-weight:700;font-size:15.5px">{f.q}</summary>
            <p class="body" style="margin-top:10px">{f.a}</p>
          </details>
        {/each}
      {/if}

      {#if e.partners.length}
        <h2 class="h" style="margin:56px 0 18px">{t('event.partners')}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:28px;align-items:center">
          {#each e.partners as pt (pt.id)}
            <a href={pt.url} target="_blank" rel="noreferrer" class="meta">{pt.name}</a>
          {/each}
        </div>
      {/if}
    </div>

    <aside>
      <div class="practical" style="background:var(--white);margin-top:0">
        <span class="label">[ {t('event.practical')} ]</span>
        <div style="margin-top:14px">
          {#each practical as r (r.k)}
            <div class="row"><span>{r.k}</span><span>{r.v}</span></div>
          {/each}
        </div>
      </div>

      <div class="wl-card" style="background:var(--bone-card);border:1px solid var(--border);padding:28px;margin-top:24px">
        {#if e.status === 'waitlist'}
          <span class="label">[ {t('wl.title')} ]</span>
          <p class="body" style="margin:12px 0 18px">{t('wl.body')}</p>

          {#if data.subscribeEndpoint}
            <form method="POST" action={data.subscribeEndpoint}>
              <input type="hidden" name="form-name" value="waitlist" />
              <input type="hidden" name="event" value={e.id} />
              <input type="hidden" name="ageMin" value={e.ageMin} />
              <input type="hidden" name="ageMax" value={e.ageMax} />
              <input type="hidden" name="locale" value={data.locale} />
              <p hidden><input name="bot-field" tabindex="-1" autocomplete="off" /></p>

              <div class="field">
                <label for="naam">{t('wl.name')}</label>
                <input id="naam" name="naam" type="text" required />
              </div>
              <div class="field">
                <label for="leeftijd">{t('wl.age')}</label>
                <input id="leeftijd" name="leeftijd" type="number" min={e.ageMin} max={e.ageMax} required />
              </div>
              <div class="field">
                <label for="email">{t('wl.email')}</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div class="field">
                <label for="gemeente">{t('wl.town')}</label>
                <input id="gemeente" name="gemeente" type="text" />
              </div>

              <!-- The guardian tick is the lawful basis for holding a child's
                   first name and age. The browser check is a courtesy; the
                   endpoint re-checks it server-side, and an earlier version that
                   did not was a defect. -->
              <div class="field field--check" style="display:flex;gap:10px;align-items:flex-start;margin:18px 0">
                <input id="consent" name="consent" type="checkbox" required style="margin-top:3px" />
                <label for="consent" style="font-size:13.5px;text-transform:none;letter-spacing:0;color:var(--ink)">
                  {t('wl.consent')}
                </label>
              </div>

              <button class="pill pill--primary" style="width:100%">{t('wl.submit')}</button>
            </form>
          {:else}
            <p class="meta" style="font-size:12.5px">{t('wl.unavailable')}</p>
          {/if}
        {:else if e.status === 'open'}
          <span class="label">[ {t('status.open')} ]</span>
          <p class="body" style="margin:12px 0 18px">{t('open.body')}</p>
          {#if data.boxOffice}
            <a class="pill pill--primary" style="width:100%" href={data.boxOffice} target="_blank" rel="noreferrer">
              {t('open.cta')}
            </a>
          {/if}
        {:else if e.status === 'full'}
          <span class="label">[ {t('status.full')} ]</span>
          <p class="body" style="margin-top:12px">{t('full.body')}</p>
        {:else}
          <span class="label">[ {t('status.past')} ]</span>
          <p class="body" style="margin-top:12px">{t('past.body')}</p>
          <a class="pill pill--secondary pill--sm" style="margin-top:14px" href={p('/journal')}>
            {t('nav.journal')}
          </a>
        {/if}
      </div>
    </aside>
  </div>
</section>

<style>
  @media (max-width: 900px) {
    .wrap {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 32px !important;
    }
  }
</style>
