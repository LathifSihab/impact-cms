<script lang="ts">
  /**
   * Pick an image, see it, replace it, remove it.
   *
   * The stored path travels in a hidden input so a save that does not touch the
   * image keeps it. The file itself posts alongside under `<name>__file`, and
   * the server writes the resulting path back into `<name>` before validation
   * runs — see server/form-uploads.ts.
   *
   * A local object URL previews the chosen file before it is uploaded, because
   * the alternative is picking a file and having nothing happen until save.
   */
  import { untrack } from 'svelte';

  let {
    name,
    value = '',
    label,
    required = false,
    maxBytes = 8 * 1024 * 1024
  }: {
    name: string;
    value?: string;
    label?: string;
    required?: boolean;
    maxBytes?: number;
  } = $props();

  let stored = $state(untrack(() => value ?? ''));
  let chosen = $state<File | null>(null);
  let previewUrl = $state<string | null>(null);
  let cleared = $state(false);
  let localError = $state<string | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  const shown = $derived(previewUrl ?? (cleared ? null : stored || null));
  /* Legacy values from the static site point at assets/... which this app does
     not serve. Saying so beats an unexplained broken image. */
  const legacy = $derived(!!stored && !stored.startsWith('/uploads/') && !cleared && !previewUrl);

  function onPick(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
    localError = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    chosen = null;

    if (!file) return;
    if (file.size > maxBytes) {
      localError = `Maximaal ${Math.floor(maxBytes / (1024 * 1024))} MB.`;
      if (input) input.value = '';
      return;
    }
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) {
      localError = 'Alleen JPG, PNG, WebP, AVIF of GIF.';
      if (input) input.value = '';
      return;
    }
    chosen = file;
    cleared = false;
    previewUrl = URL.createObjectURL(file);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    chosen = null;
    if (input) input.value = '';
    // Only a stored image needs telling the server; an unsaved pick just resets.
    cleared = !!stored;
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
</script>

<input type="hidden" {name} value={cleared ? '' : stored} />
{#if cleared}<input type="hidden" name="{name}__clear" value="1" />{/if}

<div class="img">
  <div class="img-preview" class:empty={!shown}>
    {#if shown}
      <img src={shown} alt="" />
    {:else}
      <span class="meta">Geen afbeelding</span>
    {/if}
  </div>

  <div class="img-controls">
    <input
      bind:this={input}
      type="file"
      name="{name}__file"
      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
      onchange={onPick}
      id="up-{name}"
      class="visually-hidden"
      {required}
    />
    <label class="pill pill--quiet pill--sm" for="up-{name}">
      {shown ? 'Vervangen' : 'Afbeelding kiezen'}
    </label>

    {#if shown}
      <button type="button" class="pill pill--danger pill--sm" onclick={clear}>Verwijderen</button>
    {/if}

    {#if chosen}
      <span class="meta">{chosen.name} · {kb(chosen.size)} — nog niet bewaard</span>
    {:else if legacy}
      <span class="meta">
        <span class="mono">{stored}</span> — oud pad uit de statische site, wordt hier niet getoond
      </span>
    {:else if cleared}
      <span class="meta">Wordt verwijderd bij bewaren</span>
    {/if}

    {#if localError}<span class="err">{localError}</span>{/if}
  </div>
</div>

<style>
  .img {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .img-preview {
    width: 132px;
    flex: none;
    aspect-ratio: 16 / 10;
    border: 1px solid var(--border);
    background: var(--bone-card);
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .img-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .img-preview.empty .meta {
    font-size: 11px;
  }
  .img-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }
  .img-controls .meta {
    font-size: 12px;
    flex-basis: 100%;
    overflow-wrap: anywhere;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
  /* the <label> is the button, so it needs the pointer the pill assumes */
  label.pill {
    cursor: pointer;
  }
</style>
