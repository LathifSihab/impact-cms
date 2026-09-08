<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * The edit form for any content type — the same component creates and updates,
   * because the only differences are the id field and the delete button.
   */
  import { enhance } from '$app/forms';
  import { fieldGroups, type Collection, type Field } from '$lib/collections';
  import { slugify } from '$lib/records';
  import type { RefOption } from '$lib/server/content';
  import FieldInput from './FieldInput.svelte';
  import ConsentGate from './ConsentGate.svelte';

  let {
    collection,
    record,
    errors = {},
    options = {},
    mode,
    message = null,
    problem = null
  }: {
    collection: Collection;
    record: Record<string, unknown>;
    errors?: Record<string, string>;
    options?: Record<string, RefOption[]>;
    mode: 'new' | 'edit';
    message?: string | null;
    problem?: { message: string; detail?: string } | null;
  } = $props();

  const groups = $derived(fieldGroups(collection));
  const gateField = $derived(
    collection.fields.find(
      (f): f is Extract<Field, { kind: 'consent' }> => f.kind === 'consent'
    )
  );

  let busy = $state(false);
  let confirmingDelete = $state(false);

  /* On create, the id is the slug and doubles as the filename in the original
     content folder, so it is offered rather than imposed: typed once from the
     title, then left alone the moment the user edits it themselves. */
  let idValue = $state(untrack(() => String(record.id ?? '')));
  let idTouched = $state(untrack(() => mode === 'edit'));

  function onTitleInput(e: Event) {
    if (idTouched || mode === 'edit') return;
    idValue = slugify((e.currentTarget as HTMLInputElement).value);
  }
</script>

{#if message}
  <div class="notice notice--ok">{message}</div>
{/if}

{#if problem}
  <div class="notice notice--red">
    <strong>{problem.message}</strong>
    {#if problem.detail}<br /><span class="mono">{problem.detail}</span>{/if}
  </div>
{/if}

{#if Object.keys(errors).length}
  <div class="notice notice--red">
    Er is niets bewaard. Kijk de gemarkeerde velden na.
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
    {#if mode === 'new'}
      <fieldset class="fs">
        <legend>Identiteit</legend>
        <div class="field" class:field--invalid={!!errors.id}>
          <label for="f-id">Id (slug)<span class="req">*</span></label>
          <input
            id="f-id"
            name="id"
            type="text"
            bind:value={idValue}
            oninput={() => (idTouched = true)}
            placeholder="camp-basketball-edition-2027"
          />
          {#if errors.id}<span class="err">{errors.id}</span>{/if}
          <span class="hint">
            Kleine letters, cijfers en koppeltekens. Dit is de sleutel van het record en
            verandert later niet meer.
          </span>
        </div>
      </fieldset>
    {/if}

    {#each groups as group (group.name)}
      <fieldset class="fs">
        {#if group.name}<legend>{group.name}</legend>{/if}
        <div class="grid2">
          {#each group.fields as field (field.name)}
            {#if field.kind === 'consent'}
              <!-- rendered once, below, where it cannot be missed -->
            {:else}
              <div class:full={!field.half}>
                {#if field.name === collection.title && mode === 'new'}
                  <div class="field" class:field--invalid={!!errors[field.name]}>
                    <label for="f-{field.name}">
                      {field.label}{#if field.required}<span class="req">*</span>{/if}
                    </label>
                    <input
                      id="f-{field.name}"
                      name={field.name}
                      type="text"
                      value={String(record[field.name] ?? '')}
                      oninput={onTitleInput}
                      placeholder={field.placeholder ?? ''}
                    />
                    {#if errors[field.name]}<span class="err">{errors[field.name]}</span>{/if}
                    {#if field.help}<span class="hint">{field.help}</span>{/if}
                  </div>
                {:else}
                  <FieldInput
                    {field}
                    value={record[field.name]}
                    error={errors[field.name]}
                    {options}
                  />
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </fieldset>
    {/each}

    {#if gateField}
      <ConsentGate field={gateField} value={record[gateField.name]} />
    {/if}
  </div>

  <div class="actions">
    <button class="pill pill--primary" disabled={busy}>
      {busy ? 'Bewaren…' : mode === 'new' ? `${collection.one} aanmaken` : 'Bewaren'}
    </button>
    <a class="pill pill--quiet" href="/admin/content/{collection.key}">Terug naar de lijst</a>

    {#if mode === 'edit' && !collection.fixed}
      <span class="spacer"></span>
      {#if confirmingDelete}
        <span class="meta">Zeker weten?</span>
        <button
          class="pill pill--danger pill--sm"
          formaction="?/delete"
          formnovalidate
          disabled={busy}
        >
          Ja, verwijderen
        </button>
        <button
          type="button"
          class="pill pill--quiet pill--sm"
          onclick={() => (confirmingDelete = false)}
        >
          Annuleren
        </button>
      {:else}
        <button
          type="button"
          class="pill pill--danger pill--sm"
          onclick={() => (confirmingDelete = true)}
        >
          Verwijderen
        </button>
      {/if}
    {/if}
  </div>
</form>
