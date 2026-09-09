<script lang="ts">
  /* The backoffice stylesheet is imported by admin/+layout.svelte, and this page
     deliberately sits outside /admin so the auth guard lets it through — which
     also means it does not inherit that import. It brings its own. */
  import '../../app.css';
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let busy = $state(false);
</script>

<svelte:head><title>Inloggen — IMPACT backoffice</title></svelte:head>

<div class="login">
  <div class="pane">
    <div>
      <span class="label" style="color:rgba(255,255,255,.45)">[ Backoffice ]</span>
      <h1 style="margin-top:22px">Impact<br />backoffice</h1>
      <p>
        Het beheer van de inhoud van wemakeimpact.be. Events, journal, partners,
        experts en cijfers.
      </p>
      <p style="margin-top:14px">
        Inschrijvingen, tickets en deelnemers staan niet hier maar in Ticket
        Tailor — dat blijft de plek waar het geld en de deelnemerslijst leven.
      </p>
    </div>
    <p style="font-size:11.5px;color:rgba(255,255,255,.35);margin:0">
      Gebouwd door DRP BuildLab
    </p>
  </div>

  <div class="form">
    <form
      method="POST"
      use:enhance={() => {
        busy = true;
        return async ({ update }) => {
          await update();
          busy = false;
        };
      }}
    >
      <span class="label">[ Inloggen ]</span>

      {#if !data.configured}
        <div class="notice notice--red" style="margin-top:18px">
          <strong>Niet geconfigureerd.</strong> PUBLIC_SUPABASE_URL en PUBLIC_SUPABASE_ANON_KEY
          ontbreken in de omgeving van deze deploy. Inloggen kan pas als die er zijn — en
          een nieuwe waarde telt pas na een nieuwe deploy.
        </div>
      {/if}

      {#if form?.error}
        <div class="notice notice--red" style="margin-top:18px">{form.error}</div>
      {/if}

      <input type="hidden" name="next" value={data.next} />

      <div class="field" style="margin-top:26px">
        <label for="email">E-mailadres</label>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          required
          value={form?.email ?? ''}
        />
      </div>

      <div class="field">
        <label for="password">Wachtwoord</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <button class="pill pill--primary" style="width:100%;margin-top:10px" disabled={busy}>
        {busy ? 'Bezig…' : 'Inloggen'}
      </button>

      <p class="hint" style="margin-top:18px">
        Accounts worden op uitnodiging aangemaakt. Er is geen zelfregistratie.
      </p>
    </form>
  </div>
</div>
