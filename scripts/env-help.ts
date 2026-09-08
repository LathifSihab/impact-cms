/**
 * The message shown when the Supabase variables are missing.
 *
 * It has its own file because getting this wrong wastes real time. The usual
 * cause is not a missing .env but a present one copied from .env.example and
 * never filled in — the template ships with empty values on purpose, so the
 * copy alone leaves you configured with nothing. "Set them in .env" is unhelpful
 * advice when .env already exists and looks fine.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function envHelp(root: string): string {
  const envPath = join(root, '.env');

  let diagnosis: string;
  if (!existsSync(envPath)) {
    diagnosis = 'Er is geen cms/.env.';
  } else {
    const text = readFileSync(envPath, 'utf8');
    const blank = /^\s*PUBLIC_SUPABASE_URL\s*=\s*$/m.test(text);
    diagnosis = blank
      ? 'cms/.env bestaat, maar de Supabase-waarden zijn leeg.\n' +
        '.env.example is een sjabloon zonder waarden — kopiëren alleen is niet\n' +
        'genoeg, en overschrijft een werkende .env.'
      : 'cms/.env bestaat, maar PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY\n' +
        'ontbreekt of staat verkeerd gespeld.';
  }

  return `${diagnosis}

Voor de lokale stack — dit schrijft .env voor je, geen sleutels overtypen:

  supabase start
  npm run env:local

Voor een gehost Supabase-project: zet de waarden uit
Project Settings → API zelf in cms/.env.
`;
}
