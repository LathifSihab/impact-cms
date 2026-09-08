import vercel from '@sveltejs/adapter-vercel';
import node from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/* Vercel is the deploy target (06-CMS-SCOPE.md). ADAPTER=node builds a plain
   Node server instead — useful for verifying a production build on a machine
   where the Vercel adapter cannot run, and for demoing the backoffice without
   a deploy. */
const adapter =
  process.env.ADAPTER === 'node'
    ? node()
    : // Pinned rather than inferred: the adapter otherwise picks a default from
      // whatever Node the build machine happens to run, which is how a local
      // build and a Vercel build quietly stop matching.
      vercel({ runtime: 'nodejs22.x' });

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: { adapter }
};
