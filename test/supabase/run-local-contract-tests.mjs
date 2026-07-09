import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const strict = process.env.SUPABASE_TEST_REQUIRED === '1';
const localUrls = new Set(['http://127.0.0.1:54321', 'http://localhost:54321']);

function isLocalSupabase(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return localUrls.has(parsed.origin);
  } catch {
    return false;
  }
}

if (!url || !anonKey) {
  const message =
    [
      strict ? 'Missing required local Supabase contract test env.' : 'Skipping local-only Supabase contract tests.',
      'Required env vars: SUPABASE_TEST_URL=http://127.0.0.1:54321 and SUPABASE_TEST_ANON_KEY=<local anon key>.',
      'Seed requirement: run only against a local Supabase database already prepared by the checked-in migrations/seeds.',
    ].join('\n');
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

if (!isLocalSupabase(url)) {
  console.error(
    [
      'Refusing to run Supabase contract tests outside local Supabase.',
      `Received SUPABASE_TEST_URL=${url}`,
      'Allowed origins: http://127.0.0.1:54321 or http://localhost:54321.',
    ].join('\n'),
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const checks = [
  {
    name: 'account_balances view is reachable',
    run: () => supabase.from('account_balances').select('id').limit(1),
  },
  {
    name: 'household_members table is reachable',
    run: () => supabase.from('household_members').select('household_id,user_id,status').limit(1),
  },
  {
    name: 'saving_pot_balances view is reachable',
    run: () => supabase.from('saving_pot_balances').select('id').limit(1),
  },
];

for (const check of checks) {
  const { error } = await check.run();
  if (error) {
    console.error(`Local Supabase contract failed: ${check.name}`);
    console.error(error.message);
    process.exit(1);
  }
  console.log(`ok - ${check.name}`);
}
