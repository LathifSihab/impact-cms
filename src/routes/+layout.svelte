<script lang="ts">
  /* No global stylesheet here on purpose. The backoffice and the public site
     have different ones — app.css and the site's own style.css — and they both
     style `body`. Each layout brings its own so they never both apply. */
  let { children } = $props();
</script>

{@render children()}
