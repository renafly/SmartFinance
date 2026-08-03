import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { RepoResult } from './base.repository';
import type { ImportTransactionCandidate } from '@/features/transaction-import';

export type ImportBatchRow = {
  id: string; household_id: string; account_id: string; created_by: string;
  source_file_name: string; source_file_hash: string | null;
  status: 'preview' | 'completed' | 'rolled_back' | 'failed';
  total_rows: number; imported_rows: number; skipped_rows: number;
  mapping: Record<string, unknown>; created_at: string; completed_at: string | null; rolled_back_at: string | null;
};

type Client = SupabaseClient<Database>;
const table = (client: Client, name: string) => (client as unknown as { from: (tableName: string) => any }).from(name);

export class TransactionImportRepository {
  constructor(private readonly client: Client) {}

  async createBatch(input: { householdId: string; accountId: string; createdBy: string; fileName: string; fileHash?: string; totalRows: number; mapping: Record<string, unknown> }): Promise<RepoResult<ImportBatchRow>> {
    const { data, error } = await table(this.client, 'transaction_import_batches').insert({ household_id: input.householdId, account_id: input.accountId, created_by: input.createdBy, source_file_name: input.fileName, source_file_hash: input.fileHash ?? null, total_rows: input.totalRows, mapping: input.mapping }).select('*').single();
    return error ? { data: null, error } : { data: data as ImportBatchRow, error: null };
  }

  async listDuplicateCandidates(householdId: string, accountId: string, from: string, to: string) {
    const { data, error } = await this.client.from('transactions').select('id, account_id, title, amount, type, transaction_date').eq('household_id', householdId).eq('account_id', accountId).gte('transaction_date', from).lte('transaction_date', to).is('transfer_group_id', null).order('transaction_date', { ascending: false }).limit(2000);
    if (error) return { data: null, error };
    return { data: (data ?? []).map((row) => ({ id: row.id, accountId: row.account_id, title: row.title, amount: Number(row.amount), type: row.type, transactionDate: row.transaction_date })), error: null };
  }

  async importRows(batchId: string, householdId: string, accountId: string, createdBy: string, rows: ImportTransactionCandidate[]): Promise<RepoResult<number>> {
    if (!rows.length) return { data: 0, error: null };
    const payload = rows.map((row) => ({ household_id: householdId, account_id: accountId, created_by: createdBy, import_batch_id: batchId, import_source_row: row.sourceRow, import_fingerprint: row.sourceFingerprint, title: row.title, notes: row.notes, amount: row.amount, type: row.type, transaction_date: row.transactionDate }));
    const { data, error } = await table(this.client, 'transactions').insert(payload).select('id');
    if (error) return { data: null, error };
    const imported = data?.length ?? 0;
    const completion = await table(this.client, 'transaction_import_batches').update({ status: 'completed', imported_rows: imported, skipped_rows: Math.max(0, rows.length - imported), completed_at: new Date().toISOString() }).eq('id', batchId).eq('household_id', householdId);
    return completion.error ? { data: null, error: completion.error } : { data: imported, error: null };
  }

  async rollbackBatch(batchId: string, householdId: string): Promise<RepoResult<number>> {
    const { data, error } = await table(this.client, 'transactions').delete().eq('household_id', householdId).eq('import_batch_id', batchId).select('id');
    if (error) return { data: null, error };
    const update = await table(this.client, 'transaction_import_batches').update({ status: 'rolled_back', rolled_back_at: new Date().toISOString() }).eq('id', batchId).eq('household_id', householdId).eq('status', 'completed');
    return update.error ? { data: null, error: update.error } : { data: data?.length ?? 0, error: null };
  }

  async createReconciliation(input: { householdId: string; accountId: string; createdBy: string; statementDate: string; statementBalance: number; ledgerBalance: number; notes?: string }): Promise<RepoResult<Record<string, unknown>>> {
    const { data, error } = await table(this.client, 'account_reconciliations').insert({ household_id: input.householdId, account_id: input.accountId, created_by: input.createdBy, statement_date: input.statementDate, statement_balance: input.statementBalance, ledger_balance: input.ledgerBalance, difference: Number((input.statementBalance - input.ledgerBalance).toFixed(2)), notes: input.notes ?? null }).select('*').single();
    return error ? { data: null, error } : { data: data as Record<string, unknown>, error: null };
  }
}

export const transactionImportRepository = new TransactionImportRepository(supabase);
