<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  const errors = $derived(form?.errors ?? {});
  const v = $derived(form?.values ?? { id: '', nav_label: '', hero_title: '', locale: 'nl' });
  let busy = $state(false);
</script>

<svelte:head><title>Nieuwe pagina — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ <a href="/admin/pages">Pagina's</a> ]</span>
    <h1 class="d-m">Nieuwe pagina</h1>
    <p class="body">
      Een lege pagina met alleen een hero. Secties voeg je daarna toe. Ze staat op concept tot je
      haar zichtbaar maakt.
    </p>
  </header>

  {#if form?.problem}
    <div class="notice notice--red">
      <strong>{form.problem.message}</strong>
      {#if form.problem.detail}<br /><span class="mono">{form.problem.detail}</span>{/if}
    </div>
  {/if}

  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      busy = true;
      return async ({ update }) => {
        await update({ reset: false });
        busy = false;
      };
    }}
  >
    <div class="form-card">
      <div class="field" class:field--invalid={!!errors.id}>
        <label for="id">Adres (slug)<span class="req">*</span></label>
        <input id="id" name="id" type="text" value={v.id} placeholder="veelgestelde-vragen" />
        {#if errors.id}<span class="err">{errors.id}</span>{/if}
        <span class="hint">De pagina komt op /<span class="mono">{v.id || 'adres'}</span> te staan.</span>
      </div>

      <div class="grid2">
        <div>
          <div class="field" class:field--invalid={!!errors.nav_label}>
            <label for="nav_label">Naam in de backoffice<span class="req">*</span></label>
            <input id="nav_label" name="nav_label" type="text" value={v.nav_label} />
            {#if errors.nav_label}<span class="err">{errors.nav_label}</span>{/if}
          </div>
        </div>
        <div>
          <div class="field">
            <label for="locale">Taal</label>
            <select id="locale" name="locale">
              <option value="nl" selected={v.locale === 'nl'}>Nederlands</option>
              <option value="en" selected={v.locale === 'en'}>Engels</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field" class:field--invalid={!!errors.hero_title}>
        <label for="hero_title">Titel<span class="req">*</span></label>
        <input id="hero_title" name="hero_title" type="text" value={v.hero_title} />
        {#if errors.hero_title}<span class="err">{errors.hero_title}</span>{/if}
      </div>
    </div>

    <div class="actions">
      <button class="pill pill--primary" disabled={busy}>{busy ? 'Bezig…' : 'Pagina aanmaken'}</button>
      <a class="pill pill--quiet" href="/admin/pages">Annuleren</a>
    </div>
  </form>
</div>
