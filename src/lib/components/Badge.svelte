<script lang="ts">
  import { statusLabel } from '$lib/collections';

  let {
    kind,
    value,
    yes = 'Ja',
    no = 'Nee'
  }: { kind: 'status' | 'consent'; value: unknown; yes?: string; no?: string } = $props();

  const status = $derived(String(value ?? ''));
  const on = $derived(value === true);
</script>

{#if kind === 'status'}
  <span class="badge badge--{status}">{statusLabel(status)}</span>
{:else}
  <span class="badge {on ? 'badge--yes' : 'badge--no'}">{on ? yes : no}</span>
{/if}
