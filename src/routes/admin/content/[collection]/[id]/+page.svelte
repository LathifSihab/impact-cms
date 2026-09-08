<script lang="ts">
  import RecordForm from '$lib/components/RecordForm.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  /* After a failed save the submitted values come back, so the user does not
     lose their typing to a validation error. */
  const record = $derived(form?.record ?? data.record);

  const message = $derived(
    form?.saved ? 'Bewaard.' : data.created ? `Aangemaakt.` : null
  );

  const title = $derived(String(data.record[data.collection.title] ?? data.record.id));

  function when(iso: unknown): string {
    if (!iso) return '';
    return new Date(String(iso)).toLocaleString('nl-BE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head><title>{title} — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">
      [ <a href="/admin/content/{data.collection.key}">{data.collection.label}</a> ]
    </span>
    <h1 class="d-m">{title}</h1>
    <p class="meta" style="margin-top:10px">
      <span class="mono">{data.record.id}</span>
      {#if data.record.updated_at}
        · laatst bewerkt {when(data.record.updated_at)}
      {/if}
    </p>
  </header>

  <RecordForm
    collection={data.collection}
    {record}
    errors={form?.errors ?? {}}
    options={data.options}
    problem={form?.problem ?? null}
    {message}
    mode="edit"
  />
</div>
