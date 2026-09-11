import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/data-surface';
import { Button, Field, formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import {
  useConfirmPlannedItemOccurrence,
  useMatchPlannedItemOccurrence,
  useRevertPlannedItemOccurrence,
  useUnlinkPlannedItemOccurrenceTransaction,
  useUnmatchPlannedItemOccurrence,
} from '@/features/planned-items/hooks';
import { PlannedItemOccurrenceMatchPicker } from '@/features/planned-items/components/occurrence-match-picker';
import { useToast } from '@/providers/ToastProvider';

import type {
  CategoryBudgetEntry,
  CategoryBudgetOwnTotals,
  CategoryBudgetPlannedLine,
  CategoryBudgetStatus,
  CategoryBudgetTransactionLine,
} from '../services/category-budget-view-model';

const STATUS_TONE: Record<CategoryBudgetStatus, 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  approaching: 'warning',
  over: 'destructive',
};

/**
 * Shared "unmark as paid" mutation logic -- both a paid planned line's own
 * inline action (PaidPlannedLineRow) and the expandable transaction list's
 * per-transaction unlink action (TransactionRow) land on the same three
 * mutations (unmatch / unlink-keep / revert-and-delete), so this hook
 * exists once instead of being wired up twice. See
 * unlink_planned_item_occurrence_transaction's migration doc comment for
 * why there are three distinct RPCs here rather than one: which applies
 * depends on whether the occurrence is 'matched' (an existing transaction
 * the user linked -- unmatch only ever unlinks, there is nothing of ours
 * to delete) or 'confirmed' (a transaction this app generated -- unlink
 * keeps it as an ordinary transaction, revert deletes it outright).
 */
function useUnmarkAsPaid() {
  const { t } = useTranslation('common');
  const { show: showToast } = useToast();
  const unmatchOccurrence = useUnmatchPlannedItemOccurrence();
  const unlinkTransaction = useUnlinkPlannedItemOccurrenceTransaction();
  const revertOccurrence = useRevertPlannedItemOccurrence();
  const isPending = unmatchOccurrence.isPending || unlinkTransaction.isPending || revertOccurrence.isPending;

  /** Default action for both a matched (manually-linked) and a confirmed (auto-created) occurrence -- keeps the transaction, only breaks the connection. */
  async function unlinkOnly(occurrenceId: string, isAutoCreated: boolean): Promise<boolean> {
    try {
      if (isAutoCreated) {
        await unlinkTransaction.mutateAsync(occurrenceId);
      } else {
        await unmatchOccurrence.mutateAsync(occurrenceId);
      }
      showToast(t('budget.categoryBudgets.unmarkedSuccessToast'));
      return true;
    } catch {
      showToast(t('budget.categoryBudgets.unmarkErrorToast'));
      return false;
    }
  }

  /** Only offered for an auto-created transaction -- deletes it outright. Gated by revert_planned_item_occurrence itself on the month still being open. */
  async function unlinkAndDelete(occurrenceId: string, month: string): Promise<boolean> {
    try {
      await revertOccurrence.mutateAsync({ occurrenceId, month });
      showToast(t('budget.categoryBudgets.unmarkedSuccessToast'));
      return true;
    } catch {
      showToast(t('budget.categoryBudgets.unmarkErrorToast'));
      return false;
    }
  }

  return { isPending, unlinkOnly, unlinkAndDelete };
}

/**
 * The "Unmark as paid?" confirmation body -- always offers "unlink only"
 * (default, matches an existing transaction untouched), and additionally
 * "unlink and delete" only when the transaction being disconnected is one
 * this app generated (isAutoCreated) rather than a pre-existing one the
 * user linked, per requirement 4's distinction.
 */
function UnmarkConfirmPanel({
  isAutoCreated,
  isPending,
  onUnlinkOnly,
  onUnlinkAndDelete,
  onCancel,
}: {
  isAutoCreated: boolean;
  isPending: boolean;
  onUnlinkOnly: () => void;
  onUnlinkAndDelete: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing(1) } as any}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
        {t('budget.categoryBudgets.unmarkConfirmMessage')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' } as any}>
        <Button label={t('budget.categoryBudgets.unlinkOnly')} onPress={onUnlinkOnly} variant="secondary" disabled={isPending} />
        {isAutoCreated ? (
          <Button label={t('budget.categoryBudgets.unlinkAndDelete')} onPress={onUnlinkAndDelete} variant="danger" disabled={isPending} />
        ) : null}
        <Button label={t('cancel')} onPress={onCancel} variant="secondary" disabled={isPending} />
      </View>
    </View>
  );
}

/**
 * One unpaid planned line, with an inline "mark as paid" action for the
 * (common) single-leg plain-expense shape confirm_planned_item_occurrence
 * accepts -- see that RPC's migration doc comment for exactly why a
 * split/transfer item (canMarkPaid: false) isn't offered this here and
 * points at Run Monthly Budget instead. Owns its own mutation/edit state
 * so PlannedLineList/CategoryBreakdownBlock stay plain list renderers.
 */
function UnpaidPlannedLineRow({
  line,
  month,
  mainCategoryId,
  hideValues,
  textColor,
  mutedColor,
}: {
  line: CategoryBudgetPlannedLine;
  /** "YYYY-MM" -- scopes the "link an existing transaction" candidate search to this line's month, same convention PlannedItemOccurrenceMatchPicker's other caller (planned-item-card.tsx) uses. */
  month: string;
  /** This row's card's main (root-of-hierarchy) category id -- the fallback scope "link an existing transaction" widens to (see CategoryBudgetEntry.mainCategoryId) if a search scoped to line.categoryId (this occurrence's own exact category) alone comes back empty. */
  mainCategoryId: string;
  hideValues: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { show: showToast } = useToast();
  const confirmOccurrence = useConfirmPlannedItemOccurrence();
  const matchOccurrence = useMatchPlannedItemOccurrence();
  const [isEditing, setIsEditing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [amount, setAmount] = useState(String(line.amount));

  async function handleConfirm() {
    const actualAmount = Number(amount);
    if (!Number.isFinite(actualAmount) || actualAmount <= 0) return;
    try {
      await confirmOccurrence.mutateAsync({ occurrenceId: line.occurrenceId, actualAmount });
      setIsEditing(false);
      showToast(t('budget.categoryBudgets.markPaidSuccessToast'));
    } catch {
      showToast(t('budget.categoryBudgets.markPaidErrorToast'));
    }
  }

  /** Links this occurrence to a transaction the user already logged manually, instead of confirmOccurrence creating a second one -- see PlannedItemOccurrenceMatchPicker (same component the Monthly Budget estimate-matching flow uses, reused as-is here). */
  async function handleMatch(transactionId: string) {
    try {
      await matchOccurrence.mutateAsync({ occurrenceId: line.occurrenceId, transactionId });
      setIsMatching(false);
      showToast(t('budget.categoryBudgets.linkedSuccessToast'));
    } catch {
      showToast(t('budget.categoryBudgets.markPaidErrorToast'));
    }
  }

  return (
    <View style={{ gap: spacing(1) } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>{line.name || '—'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
          <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>{displayCurrency(formatCurrency(line.amount), hideValues)}</Text>
          {line.canMarkPaid && !isEditing && !isMatching ? (
            <Pressable onPress={() => setIsEditing(true)} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>
                {t('budget.categoryBudgets.markAsPaid')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {!isEditing && !isMatching && line.sourceAccountId ? (
        <Pressable onPress={() => setIsMatching(true)} hitSlop={8} style={{ alignSelf: 'flex-start' } as any}>
          <Text style={{ color: mutedColor, fontSize: typography.fontSize[12], textDecorationLine: 'underline' } as any}>
            {t('budget.categoryBudgets.linkExistingTransaction')}
          </Text>
        </Pressable>
      ) : null}

      {!line.canMarkPaid && !isMatching ? (
        <Text style={{ color: mutedColor, fontSize: typography.fontSize[12] } as any}>{t('budget.categoryBudgets.splitItemHint')}</Text>
      ) : null}

      {isEditing ? (
        <View style={{ gap: spacing(1), paddingLeft: spacing(4) } as any}>
          <Field
            label={t('budget.categoryBudgets.actualAmountLabel')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <View style={{ flexDirection: 'row', gap: spacing(2) } as any}>
            <Button
              label={confirmOccurrence.isPending ? t('budget.categoryBudgets.markingPaid') : t('budget.categoryBudgets.confirmPaid')}
              onPress={handleConfirm}
              disabled={confirmOccurrence.isPending || !amount}
            />
            <Button label={t('cancel')} onPress={() => setIsEditing(false)} variant="secondary" disabled={confirmOccurrence.isPending} />
          </View>
        </View>
      ) : null}

      {isMatching && line.sourceAccountId ? (
        <View style={{ paddingLeft: spacing(4) } as any}>
          <PlannedItemOccurrenceMatchPicker
            accountId={line.sourceAccountId}
            month={month}
            direction="outflow"
            categoryId={line.categoryId}
            mainCategoryId={mainCategoryId}
            onSelect={(transactionId) => void handleMatch(transactionId)}
            onClose={() => setIsMatching(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * One paid/linked planned line -- shows expected vs. actual (only when
 * they differ, per requirement 2's example UI; otherwise just the one
 * amount, same as before) and an inline "Unmark as paid" action that
 * expands into UnmarkConfirmPanel. See useUnmarkAsPaid for what each
 * confirm option actually does.
 */
function PaidPlannedLineRow({
  line,
  month,
  hideValues,
  textColor,
  mutedColor,
}: {
  line: CategoryBudgetPlannedLine;
  /** "YYYY-MM" -- required by the "unlink and delete" path (revert_planned_item_occurrence is gated on this month's budget period still being open). */
  month: string;
  hideValues: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { isPending, unlinkOnly, unlinkAndDelete } = useUnmarkAsPaid();
  const [isConfirming, setIsConfirming] = useState(false);

  const hasDifferentActual = line.actualAmount !== null && Math.abs(line.actualAmount - line.amount) > 0.001;

  async function handleUnlinkOnly() {
    if (await unlinkOnly(line.occurrenceId, line.isAutoCreated)) setIsConfirming(false);
  }

  async function handleUnlinkAndDelete() {
    if (await unlinkAndDelete(line.occurrenceId, month)) setIsConfirming(false);
  }

  return (
    <View style={{ gap: spacing(1) } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>{line.name || '—'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
          {hasDifferentActual ? (
            <Text style={{ color: mutedColor, fontSize: typography.fontSize[12] } as any}>
              {t('budget.categoryBudgets.expectedVsActual', {
                expected: displayCurrency(formatCurrency(line.amount), hideValues),
                actual: displayCurrency(formatCurrency(line.actualAmount ?? 0), hideValues),
              })}
            </Text>
          ) : (
            <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>
              {displayCurrency(formatCurrency(line.actualAmount ?? line.amount), hideValues)}
            </Text>
          )}
          {!isConfirming ? (
            <Pressable onPress={() => setIsConfirming(true)} hitSlop={8}>
              <Text style={{ color: colors.destructive, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>
                {t('budget.categoryBudgets.unmarkAsPaid')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isConfirming ? (
        <View style={{ paddingLeft: spacing(4) } as any}>
          <UnmarkConfirmPanel
            isAutoCreated={line.isAutoCreated}
            isPending={isPending}
            onUnlinkOnly={() => void handleUnlinkOnly()}
            onUnlinkAndDelete={() => void handleUnlinkAndDelete()}
            onCancel={() => setIsConfirming(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

function PlannedLineList({
  title,
  lines,
  month,
  mainCategoryId,
  hideValues,
  textColor,
  mutedColor,
  interactive = false,
}: {
  title: string;
  lines: CategoryBudgetPlannedLine[];
  /** "YYYY-MM" -- only needed when interactive (threaded to UnpaidPlannedLineRow's match picker and PaidPlannedLineRow's unmark-as-paid). */
  month?: string;
  /** Only needed when interactive, and only for an unpaid line -- see UnpaidPlannedLineRow's own doc comment. */
  mainCategoryId?: string;
  hideValues: boolean;
  textColor: string;
  mutedColor: string;
  /** True for both the "still unpaid" list (offers "mark as paid") and the "paid this month" list (offers "unmark as paid") -- the plain read-only row is only used when this is false. */
  interactive?: boolean;
}) {
  if (lines.length === 0) return null;
  return (
    <View style={{ gap: spacing(1) }}>
      <Text style={{ color: mutedColor, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>{title}</Text>
      {lines.map((line) => {
        if (interactive && month && line.isPaid) {
          return <PaidPlannedLineRow key={line.occurrenceId} line={line} month={month} hideValues={hideValues} textColor={textColor} mutedColor={mutedColor} />;
        }
        if (interactive && month && mainCategoryId && !line.isPaid) {
          return (
            <UnpaidPlannedLineRow key={line.occurrenceId} line={line} month={month} mainCategoryId={mainCategoryId} hideValues={hideValues} textColor={textColor} mutedColor={mutedColor} />
          );
        }
        return (
          <View key={line.occurrenceId} style={{ flexDirection: 'row', justifyContent: 'space-between' } as any}>
            <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>{line.name || '—'}</Text>
            <Text style={{ color: textColor, fontSize: typography.fontSize[14] } as any}>{displayCurrency(formatCurrency(line.amount), hideValues)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * One row inside the expandable transaction list -- requirement 3's
 * description/amount/date/account/"currently linked" fields (category is
 * deliberately not repeated per-row: every transaction in this list
 * already belongs to the one category this card/block is already titled
 * with). A linked transaction additionally gets requirement 5's
 * per-transaction "Unlink" action, sharing the same confirm panel and
 * mutations PaidPlannedLineRow uses (via useUnmarkAsPaid) -- there is only
 * ever one planned_item_occurrence connected to a given transaction
 * (planned_item_matches.transaction_id is unique, and transactions.
 * planned_item_occurrence_id is a single column), so "unlink this
 * transaction" and "unmark that occurrence as paid" are the same action
 * looked at from two different lists.
 */
function TransactionRow({
  transaction,
  month,
  hideValues,
  textColor,
  mutedColor,
}: {
  transaction: CategoryBudgetTransactionLine;
  /** "YYYY-MM" -- required by the "unlink and delete" path, see PaidPlannedLineRow. */
  month: string;
  hideValues: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { isPending, unlinkOnly, unlinkAndDelete } = useUnmarkAsPaid();
  const [isConfirming, setIsConfirming] = useState(false);

  const occurrenceId = transaction.linkedOccurrenceId;

  async function handleUnlinkOnly() {
    if (!occurrenceId) return;
    if (await unlinkOnly(occurrenceId, transaction.isAutoCreatedTransaction)) setIsConfirming(false);
  }

  async function handleUnlinkAndDelete() {
    if (!occurrenceId) return;
    if (await unlinkAndDelete(occurrenceId, month)) setIsConfirming(false);
  }

  return (
    <View style={{ gap: spacing(1), paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.border } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(2) } as any}>
        <View style={{ flex: 1, gap: 2 } as any}>
          <Text style={{ color: textColor, fontSize: typography.fontSize[13] } as any}>{transaction.title || '—'}</Text>
          <Text style={{ color: mutedColor, fontSize: typography.fontSize[12] } as any}>
            {transaction.transactionDate} · {transaction.accountName}
          </Text>
          {occurrenceId ? (
            <Text style={{ color: colors.primary, fontSize: typography.fontSize[12] } as any}>{t('budget.categoryBudgets.currentlyLinked')}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing(1) } as any}>
          <Text style={{ color: textColor, fontSize: typography.fontSize[13] } as any}>{displayCurrency(formatCurrency(transaction.amount), hideValues)}</Text>
          {occurrenceId && !isConfirming ? (
            <Pressable onPress={() => setIsConfirming(true)} hitSlop={8}>
              <Text style={{ color: mutedColor, fontSize: typography.fontSize[12], textDecorationLine: 'underline' } as any}>
                {t('budget.categoryBudgets.unlinkTransaction')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isConfirming ? (
        <UnmarkConfirmPanel
          isAutoCreated={transaction.isAutoCreatedTransaction}
          isPending={isPending}
          onUnlinkOnly={() => void handleUnlinkOnly()}
          onUnlinkAndDelete={() => void handleUnlinkAndDelete()}
          onCancel={() => setIsConfirming(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * Replaces the old plain "{{amount}} actual ({{count}} transactions)" text
 * with the same label as a collapsible toggle -- expanding reveals
 * requirement 3's per-transaction list (TransactionRow), collapsed by
 * default so a category with many transactions doesn't push everything
 * else below it off-screen.
 */
function ActualSpendTransactions({
  actualSpent,
  transactions,
  month,
  hideValues,
  textColor,
  mutedColor,
}: {
  actualSpent: number;
  transactions: CategoryBudgetTransactionLine[];
  month: string;
  hideValues: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  if (transactions.length === 0) return null;
  return (
    <View style={{ gap: spacing(1) } as any}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), alignSelf: 'flex-start' } as any}
      >
        <Text style={{ color: mutedColor, fontSize: typography.fontSize[13] } as any}>
          {t('budget.categoryBudgets.actualSpentWithCount', { amount: displayCurrency(formatCurrency(actualSpent), hideValues), count: transactions.length })}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={mutedColor} />
      </Pressable>
      {expanded ? (
        <View style={{ paddingLeft: spacing(4) } as any}>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} month={month} hideValues={hideValues} textColor={textColor} mutedColor={mutedColor} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CategoryBreakdownBlock({ own, month, mainCategoryId, hideValues }: { own: CategoryBudgetOwnTotals; month: string; mainCategoryId: string; hideValues: boolean }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing(1), paddingLeft: spacing(4) } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' } as any}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize[14], fontWeight: String(typography.fontWeight.semibold) } as any}>{own.categoryName}</Text>
        <Text style={{ color: colors.text, fontSize: typography.fontSize[14] } as any}>{displayCurrency(formatCurrency(own.actualSpent + own.unpaidTotal), hideValues)}</Text>
      </View>
      <ActualSpendTransactions
        actualSpent={own.actualSpent}
        transactions={own.transactions}
        month={month}
        hideValues={hideValues}
        textColor={colors.text}
        mutedColor={colors.textSecondary}
      />
      <PlannedLineList title={t('budget.categoryBudgets.stillUnpaid')} lines={own.plannedUnpaid} month={month} mainCategoryId={mainCategoryId} hideValues={hideValues} textColor={colors.text} mutedColor={colors.textSecondary} interactive />
      <PlannedLineList title={t('budget.categoryBudgets.paidThisMonth')} lines={own.plannedPaid} month={month} hideValues={hideValues} textColor={colors.text} mutedColor={colors.textSecondary} interactive />
    </View>
  );
}

export function CategoryBudgetRow({
  entry,
  month,
  defaultExpanded = true,
  onEditLimit,
}: {
  entry: CategoryBudgetEntry;
  /** "YYYY-MM" -- threaded down to every unpaid planned line's "link an existing transaction" picker. */
  month: string;
  /** Starting expand/collapse state. Defaults to true -- a household typically budgets a handful of categories, and the whole point of this row (this month's transactions, unpaid/paid recurring expenses, the "mark as paid" action) is invisible while collapsed. CategoryBudgetsSection's multi-column grid (screens wide enough for more than one card per row) passes false instead, so a wide screen shows compact cards by default rather than several fully-expanded ones stacked side by side. Still individually collapsible via the same header Pressable either way. */
  defaultExpanded?: boolean;
  /** Pre-fills the "set a category limit" form with this category + its current amount, so changing a limit doesn't require re-finding the category in a separate picker further down the screen. Optional -- omit to hide the edit affordance entirely. */
  onEditLimit?: (categoryId: string, currentAmount: number) => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const tone = STATUS_TONE[entry.status];
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.destructive;
  const barPercent = Math.min(100, Math.max(0, entry.percentUsed));
  const statusLabel = t(`budget.categoryBudgets.status.${entry.status}`);

  return (
    <View style={{ gap: spacing(2), paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.border } as any}>
      <Pressable onPress={() => setExpanded((current) => !current)} style={{ gap: spacing(1) } as any}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[16], fontWeight: String(typography.fontWeight.semibold) } as any}>{entry.categoryName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
            {onEditLimit ? (
              <Pressable
                onPress={() => onEditLimit(entry.categoryId, entry.budgetAmount)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('budget.categoryBudgets.editLimit')}
              >
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <Badge label={statusLabel} tone={tone} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' } as any}>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[16] } as any}>
            {displayCurrency(formatCurrency(entry.expectedTotal), hideValues)} / {displayCurrency(formatCurrency(entry.budgetAmount), hideValues)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
            {t('budget.categoryBudgets.percentUsed', { percent: Math.round(entry.percentUsed) })}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, overflow: 'hidden' } as any}>
          <View style={{ width: `${barPercent}%`, height: '100%', backgroundColor: toneColor, borderRadius: radius.full } as any} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
          <Text style={{ color: entry.remaining < 0 ? colors.destructive : colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
            {entry.remaining >= 0
              ? t('budget.categoryBudgets.remaining', { amount: displayCurrency(formatCurrency(entry.remaining), hideValues) })
              : t('budget.categoryBudgets.overBy', { amount: displayCurrency(formatCurrency(Math.abs(entry.remaining)), hideValues) })}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ gap: spacing(4) } as any}>
          <View style={{ gap: spacing(1) } as any}>
            <ActualSpendTransactions
              actualSpent={entry.own.actualSpent}
              transactions={entry.own.transactions}
              month={month}
              hideValues={hideValues}
              textColor={colors.text}
              mutedColor={colors.textSecondary}
            />
            <PlannedLineList title={t('budget.categoryBudgets.stillUnpaid')} lines={entry.own.plannedUnpaid} month={month} mainCategoryId={entry.mainCategoryId} hideValues={hideValues} textColor={colors.text} mutedColor={colors.textSecondary} interactive />
            <PlannedLineList title={t('budget.categoryBudgets.paidThisMonth')} lines={entry.own.plannedPaid} month={month} hideValues={hideValues} textColor={colors.text} mutedColor={colors.textSecondary} interactive />
          </View>
          {entry.childBreakdown.map((child) => (
            <CategoryBreakdownBlock key={child.categoryId} own={child} month={month} mainCategoryId={entry.mainCategoryId} hideValues={hideValues} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
