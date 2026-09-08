<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Multi-select against another collection (events → foundations, experts,
   * partners) or against a fixed option list (experts → foundation numbers).
   *
   * Selected ids keep the order in which they were picked, because that order is
   * stored in the join table's `position` and is what the page renders.
   */
  import type { RefOption } from '$lib/server/content';

  let {
    name,
    options = [],
    initial = [],
    blockedNote = 'niet bevestigd'
  }: {
    name: string;
    options?: RefOption[];
    initial?: string[];
    blockedNote?: string;
  } = $props();

  let selected = $state<string[]>(untrack(() => [...(initial ?? [])]));

  function toggle(id: string) {
    selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
  }
</script>

<input type="hidden" {name} value={JSON.stringify(selected)} />

{#if options.length === 0}
  <p class="hint">Nog geen records om uit te kiezen.</p>
{:else}
  <div class="picker">
    {#each options as opt (opt.id)}
      <label class="opt">
        <input
          type="checkbox"
          checked={selected.includes(opt.id)}
          onchange={() => toggle(opt.id)}
        />
        <span>{opt.label}</span>
        {#if opt.blocked}
          <span class="sub red">{blockedNote}</span>
        {:else if opt.sub && opt.sub !== opt.label}
          <span class="sub">{opt.sub}</span>
        {/if}
      </label>
    {/each}
  </div>
{/if}
