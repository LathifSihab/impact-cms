<script lang="ts">
  import { enhance } from '$app/forms';
  import ImageInput from '$lib/components/ImageInput.svelte';
  import SectionsEditor from '$lib/components/SectionsEditor.svelte';
  import { LOCALES } from '$lib/collections';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const p = $derived(data.page);
  const errors = $derived(form?.errors ?? {});
  let busy = $state(false);

  const HERO_VARIANTS = [
    { value: 'page', label: 'Standaard paginahero' },
    { value: 'home', label: 'Home (volledig scherm)' },
    { value: 'overlaid', label: 'Met overlay' },
    { value: 'event', label: 'Event-stijl' }
  ];

  const publicHref = $derived(p.id === 'home' ? '/' : `/${p.id}`);
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
  </header>

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
              <label for="locale">Taal</label>
              <select id="locale" name="locale">
                {#each LOCALES as l (l.value)}
                  <option value={l.value} selected={l.value === p.locale}>{l.label}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="full">
            <div class="field--check">
              <input id="published" name="published" type="checkbox" checked={p.published} />
              <label for="published">Zichtbaar op de site</label>
            </div>
            <span class="hint">Uitgevinkt blijft de pagina bewerkbaar maar toont ze niet.</span>
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
    </div>
  </form>
</div>
