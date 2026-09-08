/**
 * Write .env for the local Supabase stack.
 *
 * This exists because the obvious instruction — "copy .env.example to .env and
 * fill in the keys" — has two failure modes that look identical to a broken
 * app: you forget to fill it in, or you run the copy a second time and silently
 * overwrite a working file with the blank template. Both produce
 * "Your project's URL and Key are required to create a Supabase client".
 *
 * So: read the values from the running stack, write them, and never ask anyone
 * to paste a JWT by hand.
 *
 * Run: npm run env:local
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

let raw: string;
try {
  // Through a shell, because on Windows `supabase` is a .cmd shim that cannot
  // be spawned directly. The command is a fixed string with nothing
  // interpolated into it.
  raw = execSync('supabase status -o env', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch {
  console.error(
    'Kon `supabase status` niet lezen.\n' +
      'Draait de lokale stack? Start hem met:  supabase start'
  );
  process.exit(1);
}

const status = new Map<string, string>();
for (const line of raw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
  if (m) status.set(m[1], m[2]);
}

const apiUrl = status.get('API_URL');
const anonKey = status.get('ANON_KEY');
const serviceKey = status.get('SERVICE_ROLE_KEY');

if (!apiUrl || !anonKey || !serviceKey) {
  console.error(
    'De lokale stack gaf geen API_URL, ANON_KEY en SERVICE_ROLE_KEY terug.\n' +
      'Controleer `supabase status`.'
  );
  process.exit(1);
}

/* Keep whatever real integration keys are already in .env — this script only
   owns the three Supabase values, and clobbering a Brevo key would repeat the
   exact mistake it exists to prevent. */
const keep = new Map<string, string>();
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*(BREVO_API_KEY|TICKET_TAILOR_API_KEY|PUBLIC_SITE_URL|PUBLIC_SUBSCRIBE_ENDPOINT|PUBLIC_TICKET_TAILOR_BOX_OFFICE)\s*=\s*(.*)\s*$/);
    if (m && m[2].trim()) keep.set(m[1], m[2].trim());
  }
}

const contents = `# Local development only — written by \`npm run env:local\`.
#
# These are the keys \`supabase start\` generates for every local stack. They are
# publicly documented, they work against nothing but this machine, and this file
# is gitignored. Real values live in Vercel's environment settings.
#
# Re-run \`npm run env:local\` after \`supabase stop\`/\`start\` if the keys change.

PUBLIC_SUPABASE_URL=${apiUrl}
PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}

# ---- Signalen (read-only) ---------------------------------------------------
# Leave empty and the page names the missing variable rather than showing an
# empty table that looks like "no signups".
BREVO_API_KEY=${keep.get('BREVO_API_KEY') ?? ''}
TICKET_TAILOR_API_KEY=${keep.get('TICKET_TAILOR_API_KEY') ?? ''}

# ---- the rendered public site ------------------------------------------------
PUBLIC_SITE_URL=${keep.get('PUBLIC_SITE_URL') ?? ''}
PUBLIC_SUBSCRIBE_ENDPOINT=${keep.get('PUBLIC_SUBSCRIBE_ENDPOINT') ?? ''}
PUBLIC_TICKET_TAILOR_BOX_OFFICE=${keep.get('PUBLIC_TICKET_TAILOR_BOX_OFFICE') ?? ''}
`;

writeFileSync(envPath, contents, 'utf8');

console.log(`.env geschreven voor de lokale stack op ${apiUrl}`);
for (const [k, v] of keep) console.log(`  ${k} behouden (${v.slice(0, 6)}…)`);
