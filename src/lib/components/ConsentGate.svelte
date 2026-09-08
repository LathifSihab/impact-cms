<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * The publication gate: `confirmed` on experts and figures, `consentOnFile` on
   * testimonials.
   *
   * These are not soft-delete flags. They mean a human has verified that a named
   * real person, or a public claim about outcomes, may be published — and the
   * cost of a wrong `true` is somebody's name on a website without permission.
   * So it does not look like the other checkboxes: it states the consequence,
   * it says out loud what the current state means, and it defaults to off.
   */
  import type { Field } from '$lib/collections';

  let {
    field,
    value
  }: { field: Extract<Field, { kind: 'consent' }>; value: unknown } = $props();

  let on = $state(untrack(() => value === true));
  const id = $derived(`gate-${field.name}`);
</script>

<div class="gate" class:on>
  <div class="gate-head">
    <span class="label">{on ? 'Publiceert' : 'Publiceert niet'}</span>
  </div>

  <div class="field--check">
    <input {id} type="checkbox" name={field.name} bind:checked={on} />
    <label for={id}>{field.label}</label>
  </div>

  <p class="why">{field.consequence}</p>
</div>
