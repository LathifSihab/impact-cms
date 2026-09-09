<script lang="ts">
  /**
   * Errors inside the backoffice.
   *
   * Without this file SvelteKit falls back to its own bare error page, which
   * renders outside every layout and therefore without app.css — a plain black
   * "404" on white in the middle of an otherwise styled product.
   */
  import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} — IMPACT backoffice</title></svelte:head>

<div class="page">
  <header>
    <span class="label">[ {page.status} ]</span>
    <h1 class="d-m">
      {page.status === 404 ? 'Niet gevonden' : 'Er ging iets mis'}
    </h1>
  </header>

  <div class="notice notice--red">
    {page.error?.message ?? 'Onbekende fout.'}
  </div>

  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <a class="pill pill--secondary" href="/admin">Terug naar het dashboard</a>
    <a class="pill pill--quiet" href="/admin/content/events">Events</a>
  </div>
</div>
