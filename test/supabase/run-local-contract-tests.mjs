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
  const returnedData = Array.isArray(data) ? data.length > 0 : data != null;
  if (returnedData) {
    console.error(`Local Supabase contract failed: ${name}`);
    console.error('Expected denied or empty result, but the request returned data.');
    process.exit(1);
  }
  console.log(`ok - ${name}`);
}

async function assertMovementBalanceContract(client) {
  const { data: memberships, error: membershipError } = await client
    .from('household_members')
    .select('household_id')
    .eq('status', 'active')
    .limit(1);
  if (membershipError) {
    console.error('Local Supabase contract failed: resolve seed user household for movement balances');
    console.error(membershipError.message);
    process.exit(1);
  }

  const householdId = memberships?.[0]?.household_id;
  if (!householdId) {
    console.log('Skipping movement balance shape check because the seed user has no active household.');
    return;
  }

  const { data: movements, error: movementsError } = await client.rpc('list_transaction_movements', {
    p_household_id: householdId,
    p_limit: 25,
  });
  if (movementsError) {
    console.error('Local Supabase contract failed: authenticated movement list includes balances');
    console.error(movementsError.message);
    process.exit(1);
  }
  if (!movements?.length) {
    console.log('Skipping movement balance value check because the seed household has no movements.');
    return;
  }

  const missingBalanceColumn = movements.some(
    (movement) => !Object.prototype.hasOwnProperty.call(movement, 'balance_after_transaction'),
  );
  if (missingBalanceColumn) {
    console.error('Local Supabase contract failed: movement RPC omitted balance_after_transaction.');
    process.exit(1);
  }

  const movement = movements.find((candidate) =>
    candidate.movement_kind === 'transfer' ? candidate.source_transaction_id : candidate.transaction_id,
  );
  if (movement) {
    const sourceTransactionId =
      movement.movement_kind === 'transfer' ? movement.source_transaction_id : movement.transaction_id;
    const { data: sourceTransaction, error: sourceError } = await client
      .from('transactions')
      .select('id,balance_after_transaction')
      .eq('id', sourceTransactionId)
      .single();
    if (sourceError) {
      console.error('Local Supabase contract failed: resolve source transaction balance');
      console.error(sourceError.message);
      process.exit(1);
    }
    if (Number(movement.balance_after_transaction) !== Number(sourceTransaction.balance_after_transaction)) {
      console.error('Local Supabase contract failed: movement balance does not match its source transaction.');
      process.exit(1);
    }
  }

  console.log('ok - authenticated movement list includes source-side running balances');
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

await assertDeniedOrEmpty(
  'anonymous users cannot confirm a monthly budget run',
  supabase.rpc('confirm_monthly_budget_run', {
    p_run_id: '00000000-0000-0000-0000-000000000000',
    p_transfers: [],
    p_preview: {},
  }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot delete monthly budget run transactions',
  supabase.rpc('delete_monthly_budget_run_transactions', {
    p_run_id: '00000000-0000-0000-0000-000000000000',
  }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot list transaction movements',
  supabase.rpc('list_transaction_movements', {
    p_household_id: '00000000-0000-0000-0000-000000000000',
  }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot update completed transfers',
  supabase.rpc('update_completed_transfer', {
    p_transfer_group_id: '00000000-0000-0000-0000-000000000000',
    p_source_account_id: '00000000-0000-0000-0000-000000000001',
    p_destination_account_id: '00000000-0000-0000-0000-000000000002',
    p_amount: 1,
    p_title: 'Unauthorized transfer update',
  }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot delete completed transfers',
  supabase.rpc('delete_completed_transfer', {
    p_transfer_group_id: '00000000-0000-0000-0000-000000000000',
  }),
);

await assertDeniedOrEmpty(
  'anonymous users cannot bulk update transaction categories',
  supabase.rpc('bulk_update_transaction_category', {
    p_household_id: '00000000-0000-0000-0000-000000000000',
    p_transaction_ids: ['00000000-0000-0000-0000-000000000001'],
    p_category_id: null,
  }),
);

const userAEmail = process.env.SUPABASE_TEST_USER_A_EMAIL;
const userAPassword = process.env.SUPABASE_TEST_USER_A_PASSWORD;
const householdBId = process.env.SUPABASE_TEST_HOUSEHOLD_B_ID;
const hasCrossHouseholdSeed = Boolean(userAEmail && userAPassword && householdBId);

if (hasCrossHouseholdSeed) {
  const userAClient = await signInLocalUser(userAEmail, userAPassword);

  await assertMovementBalanceContract(userAClient);

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

  await assertDeniedOrEmpty(
    'seed user A cannot bulk update household B transaction categories',
    userAClient.rpc('bulk_update_transaction_category', {
      p_household_id: householdBId,
      p_transaction_ids: ['00000000-0000-0000-0000-000000000001'],
      p_category_id: null,
    }),
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
