<script lang="ts">
  import { untrack } from 'svelte';
  /** A free-text string list: ticks, benefits, "waar we aan werken". */
  let {
    name,
    initial = [],
    placeholder = 'Toevoegen en op Enter drukken'
  }: { name: string; initial?: string[]; placeholder?: string } = $props();

  let items = $state<string[]>(untrack(() => [...(initial ?? [])]));
  let draft = $state('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    items = [...items, v];
    draft = '';
  }
  function remove(i: number) {
    items = items.filter((_, n) => n !== i);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    // inside a form, Enter would submit — the intent here is "add this one"
    e.preventDefault();
    add();
  }
</script>

<input type="hidden" {name} value={JSON.stringify(items)} />

{#if items.length}
  <div class="chips">
    {#each items as item, i (i)}
      <span class="chip">
        {item}
        <button type="button" onclick={() => remove(i)} aria-label="{item} verwijderen">×</button>
      </span>
    {/each}
  </div>
{/if}

<div class="chip-add">
  <input type="text" bind:value={draft} onkeydown={onKey} {placeholder} />
  <button type="button" class="pill pill--quiet pill--sm" onclick={add} disabled={!draft.trim()}>
    Toevoegen
  </button>
</div>
