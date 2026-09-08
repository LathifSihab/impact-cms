<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Repeatable rows of small objects — gallery, programme days, FAQ, practical.
   *
   * These are stored as jsonb and always written whole, so the editor keeps the
   * whole array in local state and posts it as one JSON hidden input. Order is
   * the array order, which is what the page renders, so moving a row up has to
   * be possible without a drag library.
   */
  import type { RowColumn } from '$lib/collections';

  let {
    name,
    columns,
    initial = [],
    addLabel = 'Rij toevoegen'
  }: {
    name: string;
    columns: readonly RowColumn[];
    initial?: Record<string, string>[];
    addLabel?: string;
  } = $props();

  const blank = () => Object.fromEntries(columns.map((c) => [c.name, ''])) as Record<string, string>;

  // Seeded from the prop once. The editor owns the array from then on, so it is
  // read untracked rather than re-derived on every prop change.
  let items = $state<Record<string, string>[]>(
    untrack(() => (initial ?? []).map((row) => ({ ...blank(), ...row })))
  );

  const template = $derived(`28px repeat(${columns.length}, minmax(0, 1fr)) 72px`);

  function add() {
    items = [...items, blank()];
  }
  function remove(i: number) {
    items = items.filter((_, n) => n !== i);
  }
  function move(i: number, by: number) {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    items = next;
  }
</script>

<input type="hidden" {name} value={JSON.stringify(items)} />

<div class="rep">
  {#if items.length === 0}
    <p class="rep-empty">Nog niets toegevoegd.</p>
  {/if}

  {#each items as item, i (i)}
    <div class="rep-item" style="grid-template-columns:{template}">
      <span class="rep-no">{String(i + 1).padStart(2, '0')}</span>

      {#each columns as col (col.name)}
        <div class="field">
          <label for="{name}-{i}-{col.name}">{col.label}</label>
          {#if col.kind === 'textarea'}
            <textarea
              id="{name}-{i}-{col.name}"
              bind:value={item[col.name]}
              placeholder={col.placeholder ?? ''}
              rows="3"
            ></textarea>
          {:else}
            <input
              id="{name}-{i}-{col.name}"
              type="text"
              bind:value={item[col.name]}
              placeholder={col.placeholder ?? ''}
            />
          {/if}
        </div>
      {/each}

      <div class="rep-tools">
        <button
          type="button"
          class="icon-btn"
          onclick={() => move(i, -1)}
          disabled={i === 0}
          title="Omhoog"
          aria-label="Rij {i + 1} omhoog">↑</button
        >
        <button
          type="button"
          class="icon-btn"
          onclick={() => move(i, 1)}
          disabled={i === items.length - 1}
          title="Omlaag"
          aria-label="Rij {i + 1} omlaag">↓</button
        >
        <button
          type="button"
          class="icon-btn rm"
          onclick={() => remove(i)}
          title="Verwijderen"
          aria-label="Rij {i + 1} verwijderen">×</button
        >
      </div>
    </div>
  {/each}

  <div class="rep-add">
    <button type="button" class="pill pill--quiet pill--sm" onclick={add}>+ {addLabel}</button>
  </div>
</div>
