<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * One field, rendered from its definition.
   *
   * Simple kinds post as ordinary named inputs. Everything with structure —
   * arrays, objects, relationships — is edited by a small component that keeps
   * the value in local state and posts one JSON hidden input under the same
   * name. src/lib/records.ts reads both shapes back on the server.
   */
  import type { Field } from '$lib/collections';
  import type { RefOption } from '$lib/server/content';
  import RowsEditor from './RowsEditor.svelte';
  import TagsEditor from './TagsEditor.svelte';
  import RefsPicker from './RefsPicker.svelte';
  import ImageInput from './ImageInput.svelte';

  let {
    field,
    value,
    error,
    options = {}
  }: {
    field: Field;
    value: unknown;
    error?: string;
    options?: Record<string, RefOption[]>;
  } = $props();

  const id = $derived(`f-${field.name}`);
  const text = $derived(value == null ? '' : String(value));
  const list = $derived(Array.isArray(value) ? (value as string[]) : []);
  /* `object` fields (seo) are small and fixed, so they are edited inline here
     rather than in their own component.

     Seeded at initialisation, not in an $effect: an effect runs only after
     hydration, which would render the hidden input as "{}" on the server and
     silently blank the field for anyone who submits before the JS lands. */
  let objectState = $state<Record<string, string>>(
    untrack(() => {
      if (field.kind !== 'object') return {};
      const src =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      return Object.fromEntries(
        field.columns.map((col) => [col.name, String(src[col.name] ?? '')])
      );
    })
  );

  /** A date column comes back from Postgres as YYYY-MM-DD; the input wants that. */
  const dateValue = $derived(text ? text.slice(0, 10) : '');
</script>

{#if field.kind === 'bool'}
  <div class="field--check">
    <input {id} type="checkbox" name={field.name} checked={value === true} />
    <label for={id}>{field.label}</label>
  </div>
  {#if field.help}<span class="hint">{field.help}</span>{/if}
{:else if field.kind === 'consent'}
  <!-- the gate is rendered by ConsentGate.svelte, which wraps this markup -->
  <div class="field--check">
    <input {id} type="checkbox" name={field.name} checked={value === true} />
    <label for={id}>{field.label}</label>
  </div>
{:else}
  <div class="field" class:field--invalid={!!error}>
    {#if field.kind === 'rows' || field.kind === 'tags' || field.kind === 'choices' || field.kind === 'refs' || field.kind === 'object' || field.kind === 'image'}
      <span class="lab">{field.label}{#if field.required}<span class="req">*</span>{/if}</span>
    {:else}
      <label for={id}>{field.label}{#if field.required}<span class="req">*</span>{/if}</label>
    {/if}

    {#if field.kind === 'textarea'}
      <textarea {id} name={field.name} rows="4" placeholder={field.placeholder ?? ''}>{text}</textarea>
    {:else if field.kind === 'markdown'}
      <textarea
        {id}
        name={field.name}
        class="tall"
        placeholder="Markdown. De tekst onder de frontmatter."
        >{text}</textarea
      >
    {:else if field.kind === 'number'}
      <input
        {id}
        type="number"
        name={field.name}
        value={text}
        step={field.integer ? '1' : 'any'}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder ?? ''}
      />
    {:else if field.kind === 'date'}
      <input {id} type="date" name={field.name} value={dateValue} />
    {:else if field.kind === 'url'}
      <input {id} type="url" name={field.name} value={text} placeholder={field.placeholder ?? 'https://'} />
    {:else if field.kind === 'select'}
      <select {id} name={field.name}>
        {#if !field.required}<option value="">—</option>{/if}
        {#each field.options as opt (opt.value)}
          <option value={opt.value} selected={opt.value === text}>{opt.label}</option>
        {/each}
      </select>
    {:else if field.kind === 'ref'}
      <select {id} name={field.name}>
        <option value="">—</option>
        {#each options[field.to] ?? [] as opt (opt.id)}
          <option value={opt.id} selected={opt.id === text}>
            {opt.label}{opt.blocked ? ' (niet bevestigd)' : ''}
          </option>
        {/each}
      </select>
    {:else if field.kind === 'refs'}
      <RefsPicker name={field.name} options={options[field.to] ?? []} initial={list} />
    {:else if field.kind === 'choices'}
      <RefsPicker
        name={field.name}
        options={field.options.map((o) => ({ id: o.value, label: o.label }))}
        initial={list}
      />
    {:else if field.kind === 'tags'}
      <TagsEditor name={field.name} initial={list} />
    {:else if field.kind === 'rows'}
      <RowsEditor
        name={field.name}
        columns={field.columns}
        initial={Array.isArray(value) ? (value as Record<string, string>[]) : []}
        addLabel={field.addLabel}
      />
    {:else if field.kind === 'object'}
      <input type="hidden" name={field.name} value={JSON.stringify(objectState)} />
      <div class="rep">
        <div class="rep-item" style="grid-template-columns:minmax(0,1fr)">
          {#each field.columns as col (col.name)}
            <div class="field">
              <label for="{id}-{col.name}">{col.label}</label>
              {#if col.kind === 'textarea'}
                <textarea id="{id}-{col.name}" rows="3" bind:value={objectState[col.name]}></textarea>
              {:else}
                <input id="{id}-{col.name}" type="text" bind:value={objectState[col.name]} />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if field.kind === 'image'}
      <ImageInput name={field.name} value={text} required={!!field.required && !text} />
    {:else}
      <input {id} type="text" name={field.name} value={text} placeholder={field.placeholder ?? ''} />
    {/if}

    {#if error}<span class="err">{error}</span>{/if}
    {#if field.help}<span class="hint">{field.help}</span>{/if}
  </div>
{/if}
