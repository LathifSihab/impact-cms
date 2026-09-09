<script lang="ts">
  import { enhance } from '$app/forms';
  import ImageInput from '$lib/components/ImageInput.svelte';
  import SectionsEditor from '$lib/components/SectionsEditor.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const p = $derived(data.page);
  const errors = $derived(form?.errors ?? {});
  let busy = $state(false);
  let confirmingDelete = $state(false);

  /* Newline-separated in the textarea, an array in the record. */
  const heroTrustText = $derived(p.heroTrust.join(String.fromCharCode(10)));

  const HERO_VARIANTS = [
    { value: 'page', label: 'Standaard paginahero' },
    { value: 'home', label: 'Home (volledig scherm)' },
    { value: 'overlaid', label: 'Met overlay' },
    { value: 'event', label: 'Event-stijl' }
  ];

  const publicHref = $derived(
    p.isTemplate ? '/events' : p.id === 'home' ? '/' : `/${p.id}`
  );

  const LANG_TABS = [
    { code: 'nl', label: 'Nederlands' },
    { code: 'en', label: 'Engels' }
  ] as const;
</script>

<svelte:head><title>{p.navLabel} — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ <a href="/admin/pages">Pagina's</a> ]</span>
    <div class="head-row">
      <h1 class="d-m">{p.navLabel}</h1>
      <a class="pill pill--secondary pill--sm" href={publicHref} target="_blank" rel="noreferrer">
        Bekijk pagina ↗
      </a>
    </div>
    <p class="meta" style="margin-top:10px"><span class="mono">{publicHref}</span></p>

    <div class="lang-tabs">
      {#each LANG_TABS as l (l.code)}
        <a
          class="lang-tab"
          class:is-on={data.locale === l.code}
          href="/admin/pages/{p.id}?locale={l.code}"
          data-sveltekit-reload
        >
          {l.label}
          {#if !data.locales.includes(l.code)}<span class="tag tag--dim">nog niet</span>{/if}
        </a>
      {/each}
    </div>
  </header>

  {#if !data.exists}
    <div class="notice">
      Deze pagina bestaat nog niet in het <strong>{data.locale === 'en' ? 'Engels' : 'Nederlands'}</strong>.
      De velden hieronder zijn overgenomen uit de Nederlandse versie — vertaal ze en bewaar om
      deze taal aan te maken.
    </div>
  {/if}

  {#if form?.saved}<div class="notice notice--ok">Bewaard.</div>{/if}
  {#if form?.problem}
    <div class="notice notice--red">
      <strong>{form.problem.message}</strong>
      {#if form.problem.detail}<br /><span class="mono">{form.problem.detail}</span>{/if}
    </div>
  {/if}
  {#if Object.keys(errors).length}
    <div class="notice notice--red">Er is niets bewaard. Kijk de gemarkeerde velden na.</div>
  {/if}

  <form
    method="POST"
    action="?/save"
    enctype="multipart/form-data"
    use:enhance={() => {
      busy = true;
      return async ({ update }) => {
        await update({ reset: false });
        busy = false;
      };
    }}
  >
    <div class="form-card">
      <fieldset class="fs">
        <legend>Hero</legend>
        <div class="grid2">
          <div class="full">
            <div class="field" class:field--invalid={!!errors.hero_title}>
              <label for="hero_title">Titel<span class="req">*</span></label>
              <input id="hero_title" name="hero_title" type="text" value={p.heroTitle} />
              {#if errors.hero_title}<span class="err">{errors.hero_title}</span>{/if}
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_label">Bovenschrift</label>
              <input id="hero_label" name="hero_label" type="text" value={p.heroLabel} placeholder="[ Events ]" />
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_variant">Hero-stijl</label>
              <select id="hero_variant" name="hero_variant">
                {#each HERO_VARIANTS as v (v.value)}
                  <option value={v.value} selected={v.value === p.heroVariant}>{v.label}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="full">
            <div class="field">
              <label for="hero_intro">Inleiding</label>
              <textarea id="hero_intro" name="hero_intro" rows="3">{p.heroIntro}</textarea>
            </div>
          </div>
          <div class="full">
            <div class="field">
              <label for="hero_trust">Geruststellers</label>
              <textarea id="hero_trust" name="hero_trust" rows="3">{heroTrustText}</textarea>
              <span class="hint">Eén per regel. Verschijnt als rijtje onder de titel.</span>
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_cta_label">Knop 1 — tekst</label>
              <input id="hero_cta_label" name="hero_cta_label" type="text" value={p.heroCtaLabel} />
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_cta_href">Knop 1 — link</label>
              <input id="hero_cta_href" name="hero_cta_href" type="text" value={p.heroCtaHref} placeholder="/over" />
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_cta2_label">Knop 2 — tekst</label>
              <input id="hero_cta2_label" name="hero_cta2_label" type="text" value={p.heroCta2Label} />
            </div>
          </div>
          <div>
            <div class="field">
              <label for="hero_cta2_href">Knop 2 — link</label>
              <input id="hero_cta2_href" name="hero_cta2_href" type="text" value={p.heroCta2Href} placeholder="/events" />
            </div>
          </div>
          <div class="full">
            <div class="field" class:field--invalid={!!errors.hero_image}>
              <span class="lab">Hero-afbeelding</span>
              <ImageInput name="hero_image" value={p.heroImage ?? ''} />
              {#if errors.hero_image}<span class="err">{errors.hero_image}</span>{/if}
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend>Secties</legend>
        <p class="hint" style="margin:-8px 0 18px">
          De inhoud van de pagina, in volgorde. Klap een sectie open om te bewerken, gebruik de
          pijlen om te verplaatsen.
        </p>
        <SectionsEditor initial={p.sections} />
      </fieldset>

      <fieldset class="fs">
        <legend>Publicatie</legend>
        <div class="grid2">
          <div>
            <div class="field" class:field--invalid={!!errors.nav_label}>
              <label for="nav_label">Naam in de backoffice<span class="req">*</span></label>
              <input id="nav_label" name="nav_label" type="text" value={p.navLabel} />
              {#if errors.nav_label}<span class="err">{errors.nav_label}</span>{/if}
            </div>
          </div>
          <div>
            <div class="field" class:field--invalid={!!errors.sort_order}>
              <label for="sort_order">Volgorde</label>
              <input id="sort_order" name="sort_order" type="number" value={p.sortOrder} />
              {#if errors.sort_order}<span class="err">{errors.sort_order}</span>{/if}
            </div>
          </div>
          <div>
            <div class="field">
              <span class="lab">Taal</span>
              <!-- Chosen by the tabs above; a select here could silently move a
                   page's content from one language row to the other. -->
              <input type="hidden" name="locale" value={data.locale} />
              <p class="body" style="margin:0">{data.locale === 'en' ? 'Engels' : 'Nederlands'}</p>
            </div>
          </div>
          <div class="full">
            <div class="field--check">
              <input id="published" name="published" type="checkbox" checked={p.published} />
              <label for="published">Zichtbaar op de site</label>
            </div>
            <span class="hint">Uitgevinkt blijft de pagina bewerkbaar maar toont ze niet.</span>
          </div>
          <div class="full">
            <!-- Carried through rather than shown as a choice: whether a record
                 is shared copy or a page is a structural fact, not a setting. -->
            {#if p.isTemplate}<input type="hidden" name="is_template" value="1" />{/if}
          </div>
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend>SEO</legend>
        <div class="field">
          <label for="seo_title">Paginatitel</label>
          <input id="seo_title" name="seo_title" type="text" value={p.seo.title ?? ''} />
        </div>
        <div class="field">
          <label for="seo_description">Omschrijving</label>
          <textarea id="seo_description" name="seo_description" rows="3">{p.seo.description ?? ''}</textarea>
        </div>
      </fieldset>
    </div>

    <div class="actions">
      <button class="pill pill--primary" disabled={busy}>{busy ? 'Bewaren…' : 'Wijzigingen bewaren'}</button>
      <a class="pill pill--quiet" href="/admin/pages">Terug naar de lijst</a>
      <span class="spacer"></span>
      <a class="pill pill--quiet pill--sm" href={publicHref} target="_blank" rel="noreferrer">Bekijk ↗</a>

      {#if data.canDelete && data.exists}
        {#if confirmingDelete}
          <span class="meta">Zeker weten?</span>
          <button class="pill pill--danger pill--sm" formaction="?/delete" formnovalidate disabled={busy}>
            Ja, verwijderen
          </button>
          <button type="button" class="pill pill--quiet pill--sm" onclick={() => (confirmingDelete = false)}>
            Annuleren
          </button>
        {:else}
          <button type="button" class="pill pill--danger pill--sm" onclick={() => (confirmingDelete = true)}>
            Verwijderen
          </button>
        {/if}
      {/if}
    </div>
  </form>
</div>

<style>
  .lang-tabs {
    display: flex;
    gap: 4px;
    margin-top: 20px;
    border-bottom: 1px solid var(--border);
  }
  .lang-tab {
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--grey-body);
    border: 1px solid transparent;
    border-bottom: 0;
    margin-bottom: -1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lang-tab:hover {
    color: var(--ink);
  }
  .lang-tab.is-on {
    background: var(--white);
    border-color: var(--border);
    color: var(--ink);
  }
</style>
