import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const strict = process.env.SUPABASE_TEST_REQUIRED === '1';
const securityCheck = process.env.SUPABASE_SECURITY_CHECK === '1';
const localUrls = new Set(['http://127.0.0.1:54321', 'http://localhost:54321']);
const privateTables = [
  'accounts',
  'categories',
  'transactions',
  'recurring_transactions',
  'saving_pots',
  'saving_pot_accounts',
  'budget_configs',
  'budget_rules',
  'monthly_budget_runs',
  'monthly_income_inputs',
  'households',
  'household_members',
  'household_invitations',
  'attachments',
  'audit_logs',
];
const householdScopedTables = [
  'accounts',
  'categories',
  'transactions',
  'recurring_transactions',
  'saving_pots',
  'budget_configs',
  'monthly_budget_runs',
  'household_members',
  'household_invitations',
  'attachments',
];

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

async function runCheck(name, run) {
  const result = await run();
  if (result?.error) {
    console.error(`Local Supabase contract failed: ${name}`);
    console.error(result.error.message);
    process.exit(1);
  }
  console.log(`ok - ${name}`);
  return result;
}

async function assertNoRows(name, query) {
  const { data, error } = await query;
  if (error) {
    console.error(`Local Supabase contract failed: ${name}`);
    console.error(error.message);
    process.exit(1);
  }
  if (Array.isArray(data) && data.length > 0) {
    console.error(`Local Supabase contract failed: ${name}`);
    console.error(`Expected zero rows, received ${data.length}. This may indicate missing or overly broad RLS.`);
    process.exit(1);
  }
  console.log(`ok - ${name}`);
}

async function assertDeniedOrEmpty(name, query) {
  const { data, error } = await query;
  if (error) {
    console.log(`ok - ${name} denied with ${error.message}`);
    return;
  }
  if (Array.isArray(data) && data.length > 0) {
    console.error(`Local Supabase contract failed: ${name}`);
    console.error(`Expected denied or empty result, received ${data.length} row(s).`);
    process.exit(1);
  }
  console.log(`ok - ${name}`);
}

async function signInLocalUser(email, password) {
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Unable to sign in local Supabase seed user ${email}.`);
    console.error(error.message);
    process.exit(1);
  }
  return client;
}

const reachabilityChecks = [
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

for (const check of reachabilityChecks) {
  await runCheck(check.name, check.run);
}

for (const table of privateTables) {
  await assertNoRows(`anonymous users cannot read ${table}`, supabase.from(table).select('*').limit(1));
}

await assertDeniedOrEmpty(
  'anonymous users cannot list private attachment storage',
  supabase.storage.from('attachments').list('', { limit: 1 }),
);

await assertDeniedOrEmpty(
  'fake public invite details token does not reveal data',
  supabase.rpc('get_household_invitation_details', { p_token: 'fake-security-token' }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot accept an invitation',
  supabase.rpc('accept_household_invitation', { p_token: 'fake-security-token' }),
);

const userAEmail = process.env.SUPABASE_TEST_USER_A_EMAIL;
const userAPassword = process.env.SUPABASE_TEST_USER_A_PASSWORD;
const householdBId = process.env.SUPABASE_TEST_HOUSEHOLD_B_ID;
const hasCrossHouseholdSeed = Boolean(userAEmail && userAPassword && householdBId);

if (hasCrossHouseholdSeed) {
  const userAClient = await signInLocalUser(userAEmail, userAPassword);

  for (const table of householdScopedTables) {
    await assertNoRows(
      `seed user A cannot read household B ${table}`,
      userAClient.from(table).select('*').eq('household_id', householdBId).limit(1),
    );
  }

  await assertDeniedOrEmpty(
    'seed user A cannot list household B attachment folder',
    userAClient.storage.from('attachments').list(`${householdBId}/transactions`, { limit: 1 }),
  );
} else {
  const message =
    'Skipping seed-dependent cross-household checks. Set SUPABASE_TEST_USER_A_EMAIL, SUPABASE_TEST_USER_A_PASSWORD, and SUPABASE_TEST_HOUSEHOLD_B_ID to enable them.';
  if (securityCheck) {
    console.warn(`warn - ${message}`);
  } else {
    console.log(message);
  }
}
