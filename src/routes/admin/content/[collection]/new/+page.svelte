<script lang="ts">
  import RecordForm from '$lib/components/RecordForm.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const record = $derived(form?.record ?? data.record);
</script>

<svelte:head><title>Nieuw {data.collection.one} — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ {data.collection.label} ]</span>
    <h1 class="d-m">Nieuw {data.collection.one}</h1>
  </header>

  <RecordForm
    collection={data.collection}
    {record}
    errors={form?.errors ?? {}}
    options={data.options}
    problem={form?.problem ?? null}
    mode="new"
  />
</div>
