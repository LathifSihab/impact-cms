<script lang="ts">
  /**
   * The ordered sections of a page, as collapsible accordions.
   *
   * One accordion per section, collapsed by default so a nine-section page is
   * still a page you can see the shape of. Each carries its type, its heading
   * and its ground, so the collapsed list reads as an outline of the page.
   *
   * The whole list posts as one JSON hidden input, the same contract every other
   * structured field in this backoffice uses. Uploads inside a section post
   * separately under `sections__<index>__<field>` and the server writes the
   * resulting paths back in before validation — see server/form-uploads.ts.
   */
  import { untrack } from 'svelte';
  import {
    GROUNDS,
    SECTION_ORDER,
    SECTIONS,
    emptySectionContent,
    sectionSummary,
    type SectionType
  } from '$lib/sections';
  import type { PageSection } from '$lib/server/pages';
  import ImageInput from './ImageInput.svelte';
  import TagsEditor from './TagsEditor.svelte';
  import RowsEditor from './RowsEditor.svelte';

  let {
    name = 'sections',
    initial = []
  }: { name?: string; initial?: PageSection[] } = $props();

  type Draft = {
    type: SectionType;
    ground: string;
    anchor: string;
    content: Record<string, any>;
  };

  let items = $state<Draft[]>(
    untrack(() =>
      (initial ?? []).map((s) => ({
        type: s.type,
        ground: s.ground ?? 'white',
        anchor: s.anchor ?? '',
        content: { ...emptySectionContent(s.type), ...(s.content ?? {}) }
      }))
    )
  );

  let open = $state<number | null>(null);
  let adding = $state(false);

  function add(type: SectionType) {
    items = [...items, { type, ground: 'white', anchor: '', content: emptySectionContent(type) }];
    open = items.length - 1;
    adding = false;
  }
  function remove(i: number) {
    items = items.filter((_, n) => n !== i);
    open = null;
  }
  function move(i: number, by: number) {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    items = next;
    open = j;
  }
</script>

<input type="hidden" {name} value={JSON.stringify(items)} />

<div class="rep">
  {#if items.length === 0}
    <p class="rep-empty">Deze pagina heeft nog geen secties.</p>
  {/if}

  {#each items as item, i (i)}
    {@const def = SECTIONS[item.type]}
    <div class="sec-item" class:is-open={open === i}>
      <div class="sec-head-row">
        <span class="rep-no">{String(i + 1).padStart(2, '0')}</span>

        <button
          type="button"
          class="sec-toggle"
          onclick={() => (open = open === i ? null : i)}
          aria-expanded={open === i}
        >
          <span class="sec-type">{def.label}</span>
          <span class="sec-sum">{sectionSummary(item.type, item.content) || '—'}</span>
          <span class="badge">{GROUNDS.find((g) => g.value === item.ground)?.label}</span>
        </button>

        <div class="rep-tools" style="padding-top:0">
          <button type="button" class="icon-btn" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Omhoog">↑</button>
          <button type="button" class="icon-btn" onclick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Omlaag">↓</button>
          <button type="button" class="icon-btn rm" onclick={() => remove(i)} aria-label="Verwijderen">×</button>
        </div>
      </div>

      {#if open === i}
        <div class="sec-body">
          <p class="hint" style="margin:0 0 18px">{def.blurb}</p>

          <div class="grid2">
            <div>
              <div class="field">
                <label for="{name}-{i}-ground">Achtergrond</label>
                <select id="{name}-{i}-ground" bind:value={item.ground}>
                  {#each GROUNDS as g (g.value)}<option value={g.value}>{g.label}</option>{/each}
                </select>
              </div>
            </div>
            <div>
              <div class="field">
                <label for="{name}-{i}-anchor">Anker</label>
                <input id="{name}-{i}-anchor" type="text" bind:value={item.anchor} placeholder="fundamenten" />
                <span class="hint">Voor links binnen de pagina, bijvoorbeeld #fundamenten.</span>
              </div>
            </div>
          </div>

          {#each def.fields as f (f.name)}
            <div class="field">
              <span class="lab">{f.label}</span>

              {#if f.kind === 'textarea'}
                <textarea rows="3" bind:value={item.content[f.name]}></textarea>
              {:else if f.kind === 'markdown'}
                <textarea class="tall" bind:value={item.content[f.name]}></textarea>
              {:else if f.kind === 'select'}
                <select bind:value={item.content[f.name]}>
                  {#each f.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
                </select>
              {:else if f.kind === 'image'}
                <!-- Uploads post outside the JSON blob; the server merges the
                     stored path back into this section before validating. -->
                <ImageInput name="{name}__{i}__{f.name}" value={String(item.content[f.name] ?? '')} />
              {:else if f.kind === 'tags'}
                <TagsEditor
                  name="{name}__{i}__{f.name}__tags"
                  initial={Array.isArray(item.content[f.name]) ? item.content[f.name] : []}
                />
              {:else if f.kind === 'rows'}
                <RowsEditor
                  name="{name}__{i}__{f.name}__rows"
                  columns={f.columns}
                  initial={Array.isArray(item.content[f.name]) ? item.content[f.name] : []}
                  addLabel={f.addLabel}
                />
              {:else}
                <input type="text" bind:value={item.content[f.name]} placeholder={f.placeholder ?? ''} />
              {/if}

              {#if f.help}<span class="hint">{f.help}</span>{/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <div class="rep-add">
    {#if adding}
      <span class="label" style="display:block;margin-bottom:12px">[ Kies een sectie ]</span>
      <div class="sec-choices">
        {#each SECTION_ORDER as type (type)}
          <button type="button" class="sec-choice" onclick={() => add(type)}>
            <strong>{SECTIONS[type].label}</strong>
            <span>{SECTIONS[type].blurb}</span>
          </button>
        {/each}
      </div>
      <button type="button" class="pill pill--quiet pill--sm" style="margin-top:12px" onclick={() => (adding = false)}>
        Annuleren
      </button>
    {:else}
      <button type="button" class="pill pill--quiet pill--sm" onclick={() => (adding = true)}>
        + Sectie toevoegen
      </button>
    {/if}
  </div>
</div>

<style>
  .sec-item {
    border-top: 1px solid var(--border);
  }
  .sec-item:first-child {
    border-top: 0;
  }
  .sec-item.is-open {
    background: var(--bone-card);
  }
  .sec-head-row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 108px;
    gap: 12px;
    align-items: center;
    padding: 12px 20px;
  }
  .sec-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
    background: none;
    border: 0;
    text-align: left;
    cursor: pointer;
    padding: 4px 0;
    min-width: 0;
  }
  .sec-type {
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
  }
  .sec-sum {
    color: var(--grey-body);
    font-size: 13.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .sec-body {
    padding: 4px 20px 24px 60px;
  }
  .sec-choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 10px;
  }
  .sec-choice {
    text-align: left;
    border: 1px solid var(--border-sand);
    background: var(--white);
    padding: 12px 14px;
    cursor: pointer;
    display: block;
  }
  .sec-choice:hover {
    border-color: var(--ink);
  }
  .sec-choice strong {
    display: block;
    font-size: 13.5px;
    margin-bottom: 4px;
  }
  .sec-choice span {
    display: block;
    font-size: 12px;
    color: var(--grey-warm);
    line-height: 1.5;
  }
  @media (max-width: 640px) {
    .sec-head-row {
      grid-template-columns: minmax(0, 1fr);
    }
    .sec-body {
      padding-left: 20px;
    }
  }
</style>
