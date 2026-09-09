<script lang="ts">
  import { untrack } from 'svelte';
  /** A free-text string list: ticks, benefits, "waar we aan werken". */
  let {
    name,
    initial = [],
    placeholder = 'Toevoegen en op Enter drukken'
  }: { name: string; initial?: string[]; placeholder?: string } = $props();

  let items = $state<string[]>(untrack(() => [...(initial ?? [])]));

  /* Adopt a changed `initial`.
   *
   * The state is seeded once so the editor owns the array while someone is
   * typing in it. But the same component instance can legitimately be handed a
   * different section's data — and silently keeping the old rows is how a
   * section's content ends up written onto its neighbour. Compare by value:
   * re-seeding on identity alone would wipe edits on every parent re-render. */
  let seen = $state(untrack(() => JSON.stringify(initial ?? [])));
  $effect(() => {
    const incoming = JSON.stringify(initial ?? []);
    if (incoming === seen) return;
    seen = incoming;
    items = [...(initial ?? [])];
  });

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
