<script lang="ts">
  /**
   * An image that serves the smallest file the viewport actually needs.
   *
   * Where variants exist this renders the same `<picture>` shape as the static
   * site: an AVIF source, a WebP source, then the original as the `<img>` every
   * browser understands. Where they do not — a legacy upload, a GIF, an
   * external URL — it renders exactly the plain `<img>` that was here before,
   * so no call site has to care which case it is in.
   *
   * `role` picks the `sizes` attribute, which is what actually decides how much
   * a phone downloads: without it the browser assumes the image fills the
   * viewport and reaches for a far larger file than the layout will ever show.
   */
  import { imageUrl } from '$lib/i18n';
  import { variants, type ImageRole } from '$lib/images';

  let {
    src,
    alt = '',
    role = 'card' as ImageRole,
    /** Overrides the role's default, for a layout that does not fit one. */
    sizes,
    ...rest
  }: {
    src: string | null | undefined;
    alt?: string;
    role?: ImageRole;
    sizes?: string;
    [key: string]: unknown;
  } = $props();

  const resolved = $derived(imageUrl(src));
  const set = $derived(resolved ? variants(resolved, role) : null);
</script>

{#if set}
  <picture>
    {#each set.sources as source (source.type)}
      <source type={source.type} srcset={source.srcset} sizes={sizes ?? set.sizes} />
    {/each}
    <img src={resolved} {alt} sizes={sizes ?? set.sizes} {...rest} />
  </picture>
{:else}
  <img src={resolved} {alt} {...rest} />
{/if}
