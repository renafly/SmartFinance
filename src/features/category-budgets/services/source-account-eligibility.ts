import type { BudgetAccountLike } from '@/features/monthly-budget/types';

type SourceAccountLike = Pick<BudgetAccountLike, 'id' | 'type' | 'owner_profile_id' | 'is_archived'>;

/**
 * Accounts a recurring expense can be paid from. Same eligibility rule the
 * other expense/movement pickers already use (transactions.tsx's account
 * select, Monthly Budget's MovementEditor in movement-card.tsx): every
 * non-archived household account, whatever its type or owner -- the picker
 * groups them by owner ("Shared" for household accounts), so ownership is
 * shown rather than filtered. The draft's current account is always kept,
 * even if it has since been archived, so editing an older item never shows
 * a blank field.
 *
 * This replaces a hardcoded `allowedTypes={['cash', 'bank']}` filter that
 * no other expense flow applies: a household whose accounts are all of
 * another type (credit card, savings, ...) got an empty Source account
 * picker here, with nothing to select and no explanation.
 */
export function getEligibleSourceAccounts<T extends SourceAccountLike>(accounts: T[], selectedAccountId: string): T[] {
  return accounts.filter((account) => account.id === selectedAccountId || !account.is_archived);
}

const EVERYDAY_ACCOUNT_TYPES = ['cash', 'bank'];

/** Pre-selection for a new item only (the picker still offers every eligible account): the current user's own everyday (cash/bank) account, then a shared one, then any everyday account, then the first eligible account of any type. */
export function pickDefaultSourceAccountId(accounts: SourceAccountLike[], currentProfileId: string | null): string {
  const eligible = getEligibleSourceAccounts(accounts, '');
  const everyday = eligible.filter((account) => EVERYDAY_ACCOUNT_TYPES.includes(account.type));
  return (
    everyday.find((account) => currentProfileId && account.owner_profile_id === currentProfileId)?.id ??
    everyday.find((account) => !account.owner_profile_id)?.id ??
    everyday[0]?.id ??
    eligible[0]?.id ??
    ''
  );
}
