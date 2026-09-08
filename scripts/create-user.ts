/**
 * Create a backoffice account.
 *
 * There is no self-registration: accounts are made deliberately, by someone with
 * the service-role key. Disable email signups in Supabase Auth so that stays
 * true.
 *
 * Run: npm run user:create -- mirte@example.com 'a real password'
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(join(root, '.env'));

const [email, password] = process.argv.slice(2);
const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error("Gebruik: npm run user:create -- <e-mail> '<wachtwoord>'");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error('PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn nodig.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Kies een wachtwoord van minstens 10 tekens.');
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  // No inbox is configured for this project yet, and an unconfirmable account
  // cannot log in. Confirm on creation, since a human is doing this on purpose.
  email_confirm: true
});

if (error) {
  console.error(`Aanmaken mislukt: ${error.message}`);
  process.exit(1);
}

console.log(`Account aangemaakt: ${data.user?.email}`);
