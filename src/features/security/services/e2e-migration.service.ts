/**
 * Client-side E2E ("zero-knowledge") encryption migration tool.
 *
 * See docs/e2e-encryption-plan.md for the full design. This file is a
 * SCAFFOLD, not a finished feature — the crypto primitives are behind the
 * `E2ECrypto` interface below so the actual library (tweetnacl vs
 * libsodium-wrappers vs something else — see plan §8) can be swapped in
 * once it's spiked against this repo's Expo/RN/web build, without
 * reshaping everything that depends on it.
 *
 * WHY THIS HAS TO BE A CLIENT-SIDE MODULE, NOT A SERVER-SIDE SCRIPT:
 * the whole point of zero-knowledge encryption is that the server never
 * sees a plaintext value next to the key that could decrypt it. Only an
 * authenticated household member's device can hold the household data key
 * (HDK) in memory, so only that device can read today's plaintext rows and
 * write tomorrow's ciphertext. This module is designed to be invoked from
 * an in-app, admin-only "Enable end-to-end encryption" screen using the
 * user's normal authenticated Supabase client — not run out-of-band with a
 * service-role key (a service-role client could write ciphertext, but it
 * cannot *produce* correct ciphertext without the HDK, and must never be
 * given the HDK).
 *
 * Migration is per-household, batched, and resumable via
 * `household_encryption_status.migration_progress` (see the
 * 20260814120000_e2e_encryption_foundation.sql migration) so it can
 * survive the app being backgrounded or a network blip mid-run.
 */

import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";

// ------------------------------------------------------------
// 1. Crypto interface (implementation TBD — see docs/e2e-encryption-plan.md §8)
// ------------------------------------------------------------

/**
 * Abstraction over the actual crypto library so the rest of this module
 * (and the rest of the app) doesn't need to know which one was chosen.
 * Implement this once against the spiked library and wire it in via
 * `setE2ECryptoProvider` below — everything else in this file is written
 * against this interface only.
 */
export interface E2ECrypto {
  /** Generates a fresh random symmetric key (the HDK, or a member's private key material). */
  generateSymmetricKey(): Promise<Uint8Array>;
  /** Generates an X25519 (or equivalent) keypair for a member. */
  generateKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>;
  /** Derives a symmetric key from a passphrase + salt (Argon2id recommended). Returns the key and the KDF params used, so params can be tuned later without breaking old wraps. */
  deriveKeyFromPassphrase(
    passphrase: string,
    salt: Uint8Array,
  ): Promise<{ key: Uint8Array; kdfParams: Record<string, unknown> }>;
  /** Symmetric AEAD encrypt (e.g. XChaCha20-Poly1305). Returns ciphertext with nonce/tag embedded, ready to store as-is. */
  encryptSymmetric(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  /** Symmetric AEAD decrypt, inverse of the above. */
  decryptSymmetric(key: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array>;
  /** Asymmetric "wrap": encrypts `payload` (e.g. the HDK) to `recipientPublicKey`, using the sender's own keypair for authentication (sealed-box or crypto_box-style). */
  wrapForRecipient(
    payload: Uint8Array,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array,
  ): Promise<Uint8Array>;
  /** Inverse of wrapForRecipient — unwraps a payload that was wrapped to my own public key. */
  unwrapForSelf(
    wrapped: Uint8Array,
    myPublicKey: Uint8Array,
    myPrivateKey: Uint8Array,
  ): Promise<Uint8Array>;
}

let cryptoProvider: E2ECrypto | null = null;

/** Call once at app startup (after the crypto library spike lands) to wire in the real implementation. */
export function setE2ECryptoProvider(provider: E2ECrypto): void {
  cryptoProvider = provider;
}

function requireCrypto(): E2ECrypto {
  if (!cryptoProvider) {
    throw new Error(
      "E2E crypto provider not configured. Call setE2ECryptoProvider() during app startup before using e2e-migration.service.ts — see docs/e2e-encryption-plan.md §8.",
    );
  }
  return cryptoProvider;
}

// ------------------------------------------------------------
// 2. String <-> bytes helpers (encoding is an implementation detail, not part of the crypto interface)
// ------------------------------------------------------------

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function numberToBytes(value: number): Uint8Array {
  // Amounts are stored as numeric(14,2) — encode as a fixed-precision
  // string (not a float) to avoid any floating-point round-trip risk.
  return textEncoder.encode(value.toFixed(2));
}

function bytesToNumber(bytes: Uint8Array): number {
  return Number.parseFloat(textDecoder.decode(bytes));
}

// ------------------------------------------------------------
// 3. Per-table batch migration
// ------------------------------------------------------------

const BATCH_SIZE = 200;

type MigratableTable =
  | "accounts"
  | "transactions"
  | "budget_rules"
  | "budget_rule_allocations"
  | "saving_pots"
  | "monthly_income_inputs"
  | "recurring_transactions"
  | "transaction_splits"
  | "account_reconciliations"
  | "transaction_rules"
  | "merchant_aliases";

/**
 * Declarative description of which plaintext columns on a table map to
 * which `*_enc` columns, and whether each is numeric (amount-like, encoded
 * via numberToBytes) or text. Keep this in sync with
 * supabase/migrations/20260814120000_e2e_encryption_foundation.sql — it is
 * the single source of truth both files must agree on.
 */
const TABLE_FIELD_MAP: Record<
  MigratableTable,
  { plaintextColumn: string; encColumn: string; kind: "numeric" | "text" }[]
> = {
  accounts: [{ plaintextColumn: "initial_balance", encColumn: "initial_balance_enc", kind: "numeric" }],
  transactions: [
    { plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" },
    { plaintextColumn: "title", encColumn: "title_enc", kind: "text" },
    { plaintextColumn: "notes", encColumn: "notes_enc", kind: "text" },
    { plaintextColumn: "merchant_name", encColumn: "merchant_name_enc", kind: "text" },
  ],
  budget_rules: [{ plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" }],
  budget_rule_allocations: [{ plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" }],
  saving_pots: [{ plaintextColumn: "target_amount", encColumn: "target_amount_enc", kind: "numeric" }],
  monthly_income_inputs: [{ plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" }],
  recurring_transactions: [
    { plaintextColumn: "title", encColumn: "title_enc", kind: "text" },
    { plaintextColumn: "notes", encColumn: "notes_enc", kind: "text" },
    { plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" },
  ],
  transaction_splits: [
    { plaintextColumn: "amount", encColumn: "amount_enc", kind: "numeric" },
    { plaintextColumn: "notes", encColumn: "notes_enc", kind: "text" },
  ],
  account_reconciliations: [
    { plaintextColumn: "statement_balance", encColumn: "statement_balance_enc", kind: "numeric" },
    { plaintextColumn: "ledger_balance", encColumn: "ledger_balance_enc", kind: "numeric" },
  ],
  transaction_rules: [
    { plaintextColumn: "pattern", encColumn: "pattern_enc", kind: "text" },
    { plaintextColumn: "normalized_pattern", encColumn: "normalized_pattern_enc", kind: "text" },
    { plaintextColumn: "merchant_name", encColumn: "merchant_name_enc", kind: "text" },
  ],
  merchant_aliases: [
    { plaintextColumn: "alias", encColumn: "alias_enc", kind: "text" },
    { plaintextColumn: "normalized_alias", encColumn: "normalized_alias_enc", kind: "text" },
    { plaintextColumn: "merchant_name", encColumn: "merchant_name_enc", kind: "text" },
  ],
};

const MIGRATION_TABLE_ORDER: MigratableTable[] = [
  "accounts",
  "saving_pots",
  "budget_rules",
  "budget_rule_allocations",
  "monthly_income_inputs",
  "recurring_transactions",
  "transactions",
  "transaction_splits",
  "account_reconciliations",
  "transaction_rules",
  "merchant_aliases",
];

type MigrationProgress = Partial<Record<MigratableTable, { migratedRowCount: number; done: boolean }>>;

async function loadProgress(householdId: string): Promise<MigrationProgress> {
  const { data, error } = await supabase
    .from("household_encryption_status")
    .select("migration_progress")
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  return (data?.migration_progress as MigrationProgress | null) ?? {};
}

async function saveProgress(householdId: string, progress: MigrationProgress): Promise<void> {
  const { error } = await supabase
    .from("household_encryption_status")
    .update({ migration_progress: progress, updated_at: new Date().toISOString() })
    .eq("household_id", householdId);
  if (error) throw error;
}

/**
 * Migrates one table for one household, in batches, resuming from
 * `progress[table].migratedRowCount` if this is a re-run after an
 * interruption. Assumes `hdk` is already unwrapped and held in memory for
 * the duration of the migration (never persisted).
 *
 * NOTE ON ROW SHAPE: this uses `select("*")` per batch for simplicity in
 * this scaffold — a real implementation should select only
 * `id, enc_version, <plaintext columns>, <enc columns>` explicitly, both
 * for payload size and so a schema change to the table doesn't silently
 * pull in a new column this migration wasn't reviewed against.
 */
async function migrateTable(
  table: MigratableTable,
  householdId: string,
  hdk: Uint8Array,
  onBatchComplete: (migratedRowCount: number) => Promise<void>,
): Promise<void> {
  const crypto = requireCrypto();
  const fields = TABLE_FIELD_MAP[table];
  let migratedInThisRun = 0;

  // eslint-disable-next-line no-constant-condition -- resumable batch loop, exits via `break` below
  while (true) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .eq("household_id", householdId)
      .eq("enc_version", 0)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows as Record<string, unknown>[]) {
      const updates: Record<string, unknown> = { enc_version: 1 };
      for (const field of fields) {
        const plaintextValue = row[field.plaintextColumn];
        if (plaintextValue === null || plaintextValue === undefined) continue;
        const plaintextBytes =
          field.kind === "numeric"
            ? numberToBytes(plaintextValue as number)
            : textEncoder.encode(String(plaintextValue));
        const ciphertext = await crypto.encryptSymmetric(hdk, plaintextBytes);
        updates[field.encColumn] = ciphertext;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .eq("id", row.id as string)
        .eq("enc_version", 0); // guards against double-migrating a row another concurrent run already claimed
      if (updateError) throw updateError;
    }

    migratedInThisRun += rows.length;
    await onBatchComplete(migratedInThisRun);

    if (rows.length < BATCH_SIZE) break;
  }
}

// ------------------------------------------------------------
// 4. Top-level entry point
// ------------------------------------------------------------

export interface EnableEncryptionParams {
  householdId: string;
  /** The current user's already-unwrapped HDK, if this household already has one (e.g. a second admin resuming a partial migration). If omitted, a new HDK is generated — only do this for a household enabling encryption for the first time. */
  existingHdk?: Uint8Array;
  onProgress?: (table: MigratableTable, migratedRowCount: number) => void;
}

/**
 * Entry point invoked from the "Enable end-to-end encryption" admin
 * screen. Does NOT wrap the HDK to other members — that is a separate step
 * (`wrapHouseholdKeyForMember`, below) that must be repeated for every
 * current member before this household's encryption can be considered
 * fully enabled (see docs/e2e-encryption-plan.md §5.2 and §6, step 3-4).
 */
export async function migrateHouseholdToE2EEncryption(params: EnableEncryptionParams): Promise<void> {
  const { householdId, onProgress } = params;
  const crypto = requireCrypto();
  const hdk = params.existingHdk ?? (await crypto.generateSymmetricKey());

  await supabase
    .from("household_encryption_status")
    .upsert(
      { household_id: householdId, is_enabled: true, migration_status: "in_progress" },
      { onConflict: "household_id" },
    );

  const progress = await loadProgress(householdId);

  for (const table of MIGRATION_TABLE_ORDER) {
    if (progress[table]?.done) continue;
    await migrateTable(table, householdId, hdk, async (migratedRowCount) => {
      progress[table] = { migratedRowCount, done: false };
      await saveProgress(householdId, progress);
      onProgress?.(table, migratedRowCount);
    });
    progress[table] = { migratedRowCount: progress[table]?.migratedRowCount ?? 0, done: true };
    await saveProgress(householdId, progress);
  }

  await supabase
    .from("household_encryption_status")
    .update({ migration_status: "completed" })
    .eq("household_id", householdId);

  // IMPORTANT: the HDK itself is never written anywhere by this function.
  // The caller is responsible for wrapping it to the enabling user's own
  // keypair (so they can retrieve it on their next session) via
  // wrapHouseholdKeyForMember — do this immediately after this call
  // returns, while `hdk` is still in memory.
}

/**
 * Wraps an already-known HDK to a specific member's public key and stores
 * the wrap. Called once per member: by the enabling admin for themselves
 * right after migrateHouseholdToE2EEncryption, and again by any existing
 * member whenever a new member needs onboarding (see
 * docs/e2e-encryption-plan.md §2.1 and the invite-acceptance flow changes
 * described in §6, step 3 — not implemented here, since that's a UI-flow
 * change in the households feature, not a migration-tool concern).
 */
export async function wrapHouseholdKeyForMember(params: {
  householdId: string;
  hdk: Uint8Array;
  memberUserId: string;
  memberPublicKey: Uint8Array;
  wrappedBySenderPrivateKey: Uint8Array;
}): Promise<void> {
  const crypto = requireCrypto();
  const wrapped = await crypto.wrapForRecipient(
    params.hdk,
    params.memberPublicKey,
    params.wrappedBySenderPrivateKey,
  );

  const { error } = await supabase.from("household_key_wraps").upsert(
    {
      household_id: params.householdId,
      member_user_id: params.memberUserId,
      wrapped_household_key: wrapped as unknown as string, // bytea over PostgREST is base64-encoded automatically by supabase-js; cast reflects that boundary, not a real string value
    } satisfies Database["public"]["Tables"]["household_key_wraps"]["Insert"],
    { onConflict: "household_id,member_user_id" },
  );
  if (error) throw error;
}

/**
 * Retrieves and unwraps the current user's copy of a household's HDK,
 * given their own already-unlocked private key (i.e. after they've entered
 * their vault passphrase this session). This is what every read/write path
 * elsewhere in the app (Wage Flow, transaction list, balances, etc.) would
 * call once, cache in memory for the session, and pass down to whatever
 * decrypts/encrypts rows — not re-implemented per-feature.
 */
export async function unwrapHouseholdKey(params: {
  householdId: string;
  myUserId: string;
  myPublicKey: Uint8Array;
  myPrivateKey: Uint8Array;
}): Promise<Uint8Array> {
  const crypto = requireCrypto();
  const { data, error } = await supabase
    .from("household_key_wraps")
    .select("wrapped_household_key")
    .eq("household_id", params.householdId)
    .eq("member_user_id", params.myUserId)
    .single();
  if (error) throw error;

  const wrapped = data.wrapped_household_key as unknown as Uint8Array;
  return crypto.unwrapForSelf(wrapped, params.myPublicKey, params.myPrivateKey);
}
