import { repositories } from "@/repositories";
import { validateReimbursementDraft } from "@/features/transactions/utils/reimbursements";

export type CreateReimbursementInput = {
  household_id: string;
  transaction_id: string;
  payer_name: string;
  amount: number;
  note?: string | null;
  created_by: string;
};

export type UpdateReimbursementInput = {
  id: string;
  payer_name?: string;
  amount?: number;
  note?: string | null;
};

/**
 * The write path for a transaction's reimbursements. Unlike
 * transactionAllocationsService.replace (which atomically replaces a whole
 * set so it keeps summing to the transaction total), reimbursement rows
 * are independent add/edit/remove operations -- there's no sum invariant
 * to protect -- so this is deliberately simple CRUD. See
 * docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2.
 */
class TransactionReimbursementsService {
  async getForTransaction(transactionId: string) {
    const { data, error } =
      await repositories.transactionReimbursements.listForTransaction(transactionId);
    if (error) throw error;
    return data ?? [];
  }

  async getEffectiveAmount(transactionId: string) {
    const { data, error } =
      await repositories.transactionReimbursements.getEffectiveAmount(transactionId);
    if (error) throw error;
    return data;
  }

  async listEffectiveAmountsForHousehold(householdId: string) {
    const { data, error } =
      await repositories.transactionReimbursements.listEffectiveAmountsForHousehold(householdId);
    if (error) throw error;
    return data ?? [];
  }

  async createReimbursement(input: CreateReimbursementInput) {
    const errors = validateReimbursementDraft({
      payerName: input.payer_name,
      amount: input.amount,
    });
    if (errors.length > 0) {
      throw new Error(`Invalid reimbursement: ${errors.join(", ")}`);
    }

    const { data, error } = await repositories.transactionReimbursements.create({
      household_id: input.household_id,
      transaction_id: input.transaction_id,
      payer_name: input.payer_name.trim(),
      amount: input.amount,
      note: input.note?.trim() || null,
      created_by: input.created_by,
    });
    if (error) throw error;
    return data;
  }

  async updateReimbursement(input: UpdateReimbursementInput) {
    const { id, ...rest } = input;
    if (rest.amount !== undefined && !(rest.amount > 0)) {
      throw new Error("Invalid reimbursement: non_positive_amount");
    }
    if (rest.payer_name !== undefined && !rest.payer_name.trim()) {
      throw new Error("Invalid reimbursement: missing_payer_name");
    }

    const { data, error } = await repositories.transactionReimbursements.update(id, {
      ...rest,
      payer_name: rest.payer_name?.trim(),
      note: rest.note === undefined ? undefined : rest.note?.trim() || null,
    });
    if (error) throw error;
    return data;
  }

  async deleteReimbursement(id: string) {
    const { error } = await repositories.transactionReimbursements.delete(id);
    if (error) throw error;
  }
}

export const transactionReimbursementsService = new TransactionReimbursementsService();
