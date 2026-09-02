import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Field, Pill, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountMultiSelect, GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import type { BudgetAccountLike, BudgetMemberLike } from '@/features/monthly-budget/types';

import type { PlannedItemAllocationMode, PlannedItemDestinationDraft } from '../types';
import {
  distributeEqualSplitPreview,
  effectiveAllocationMode,
  generateDestinationDraftId,
  roundMoney,
  sumDestinationAmounts,
  sumDestinationPercents,
} from '../utils';
import { AccountBrowseModeToggle, PotDestinationBrowser, type PotAwareBrowseMode } from './pot-destination-picker';

/**
 * Always-visible allocation readout: total / allocated so far / remaining
 * unallocated, plus (percent mode only) allocated % / remaining %. Shown
 * for every effective mode, not just custom ones -- equal_split is always
 * balanced by construction, but the brief's design spec calls for the
 * summary unconditionally, and showing "Fully allocated" for equal_split
 * is a cheap, honest confirmation rather than dead weight. Adapted from
 * budget-rule-card.tsx's AllocationSummary (amount-only, 2 modes) to cover
 * all 3 planned-item modes plus a percent readout.
 *
 * This same Total/Assigned/Remaining + balanced/over-budget readout is
 * what satisfies the multi-account allocation UX requirement (assigned <
 * total shows the amber "left to assign" state, assigned > total shows the
 * red over-budget state, assigned === total shows the green "fully
 * assigned" state) -- nothing extra was needed for that once accounts can
 * be bulk-added (see addDestinationsFromPicker below).
 */
function AllocationSummary({
  mode,
  totalAmount,
  destinations,
}: {
  mode: PlannedItemAllocationMode;
  totalAmount: number;
  destinations: PlannedItemDestinationDraft[];
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number) => displayCurrency(formatCurrency(value), hideValues);

  const isPercent = mode === 'custom_percent';
  const allocatedPercent = isPercent ? sumDestinationPercents(destinations) : null;
  const remainingPercent = isPercent ? roundMoney(100 - (allocatedPercent ?? 0)) : null;
  const allocatedAmount = isPercent
    ? roundMoney((totalAmount * (allocatedPercent ?? 0)) / 100)
    : mode === 'equal_split'
      ? totalAmount
      : sumDestinationAmounts(destinations);
  const remainingAmount = roundMoney(totalAmount - allocatedAmount);
  const isBalanced =
    mode === 'equal_split' ? true : isPercent ? Math.abs(remainingPercent ?? 0) < 0.01 : Math.abs(remainingAmount) < 0.01;
  const isOver = isPercent ? (remainingPercent ?? 0) < -0.01 : remainingAmount < -0.01;

  return (
    <View
      style={{
        gap: spacing(1.5),
        padding: spacing(3),
        borderRadius: radius.lg,
        borderWidth: isBalanced ? 1 : 2,
        borderColor: isBalanced ? colors.border : colors.destructive,
        backgroundColor: isBalanced ? colors.surface : colors.destructiveSoft,
      } as any}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.allocationTotal')}
        </Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{money(totalAmount)}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.allocationAssigned')}
        </Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{money(allocatedAmount)}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.plannedItems.remainingLabel')}
        </Text>
        <Text style={{ color: remainingAmount < -0.01 ? colors.destructive : colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
          {money(remainingAmount)}
        </Text>
      </View>
      {isPercent ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t('budget.plannedItems.allocationAllocatedPercent')}
            </Text>
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{allocatedPercent}%</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t('budget.plannedItems.allocationRemainingPercent')}
            </Text>
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{remainingPercent}%</Text>
          </View>
        </>
      ) : null}
      {!isBalanced ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="warning" size={16} color={colors.destructive} />
          <Text style={{ flex: 1, color: colors.destructive, fontWeight: String(typography.fontWeight.extraBold) } as any}>
            {isPercent
              ? isOver
                ? t('budget.plannedItems.allocationOverByPercent', { percent: Math.abs(remainingPercent ?? 0) })
                : t('budget.plannedItems.allocationRemainingByPercent', { percent: Math.abs(remainingPercent ?? 0) })
              : isOver
                ? t('budget.allocationOverBy', { amount: money(Math.abs(remainingAmount)) })
                : t('budget.allocationRemaining', { amount: money(Math.abs(remainingAmount)) })}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {isPercent ? t('budget.plannedItems.allocationBalancedPercent') : t('budget.allocationBalanced')}
          </Text>
        </View>
      )}
    </View>
  );
}

type PlannedItemDestinationsEditorProps = {
  totalAmount: number;
  destinations: PlannedItemDestinationDraft[];
  allocationMode: PlannedItemAllocationMode;
  sourceAccountId: string;
  /** Estimates never fan out to more than one destination (they exist to be matched to a single real transaction, not split across accounts). */
  isEstimate: boolean;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
  accountNameMap: Map<string, string>;
  destinationAccountTypeLabels: Record<string, string>;
  onSetDestinations: (destinations: PlannedItemDestinationDraft[], allocationMode: PlannedItemAllocationMode) => void;
  disabled?: boolean;
};

export function PlannedItemDestinationsEditor({
  totalAmount,
  destinations,
  allocationMode,
  sourceAccountId,
  isEstimate,
  accounts,
  members,
  categories,
  accountNameMap,
  destinationAccountTypeLabels,
  onSetDestinations,
  disabled = false,
}: PlannedItemDestinationsEditorProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const [browseModeByRow, setBrowseModeByRow] = useState<Record<string, PotAwareBrowseMode>>({});

  const mode = effectiveAllocationMode(destinations.length, allocationMode);
  const maxDestinations = isEstimate ? 1 : Infinity;
  const canAddMore = !disabled && destinations.length < maxDestinations;
  const remainingSlots = maxDestinations === Infinity ? undefined : maxDestinations - destinations.length;

  function updateDestination(id: string, patch: Partial<PlannedItemDestinationDraft>) {
    const next = destinations.map((destination) => (destination.id === id ? { ...destination, ...patch } : destination));
    onSetDestinations(next, effectiveAllocationMode(next.length, allocationMode));
  }

  /**
   * Bulk-add entry point: the account picker (GroupedAccountMultiSelect)
   * lets the user check several accounts at once and confirm in a single
   * action, so a 3-account split is one "Add accounts" tap + one Done tap
   * instead of three separate "Add destination" + per-row account-pick
   * round trips. Each newly-picked account becomes its own destination row
   * with a blank, independently-editable amount -- exactly the worked
   * example's "Santander €200 / ActivoBank €150 / Revolut €150" shape.
   *
   * Mode choice: going from 0/1 destinations (mode 'single') straight to
   * 2+ jumps to 'custom_amount' rather than 'equal_split' -- bulk-picking
   * several specific accounts signals the user already knows which
   * accounts participate and wants to type each one's amount, not have it
   * split evenly. If a mode was already explicitly chosen (equal_split /
   * custom_percent), adding more accounts keeps that choice.
   */
  function addDestinationsFromPicker(accountIds: string[]) {
    if (accountIds.length === 0) return;
    const newDestinations: PlannedItemDestinationDraft[] = accountIds.map((accountId) => ({
      id: generateDestinationDraftId(),
      destinationAccountId: accountId,
      amount: '',
      percent: '',
      categoryId: null,
    }));
    const next = [...destinations, ...newDestinations];
    const requestedMode = allocationMode === 'single' ? 'custom_amount' : allocationMode;
    onSetDestinations(next, effectiveAllocationMode(next.length, requestedMode));
  }

  function removeDestination(id: string) {
    const next = destinations.filter((destination) => destination.id !== id);
    onSetDestinations(next, effectiveAllocationMode(next.length, allocationMode));
  }

  function setMode(nextMode: PlannedItemAllocationMode) {
    onSetDestinations(destinations, nextMode);
  }

  const equalSplitPreview = mode === 'equal_split' ? distributeEqualSplitPreview(totalAmount, destinations.length) : [];
  // Never offer the source account or an account already added as a
  // destination row -- "accounts already selected should not appear as
  // available duplicates" applies to the bulk picker exactly like it
  // already does to each row's own account swap below.
  const alreadyUsedAccountIds = [sourceAccountId, ...destinations.map((destination) => destination.destinationAccountId)];

  return (
    <View style={{ gap: spacing(2.5) } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {t('budget.plannedItems.destinationsTitle')}
          </Text>
        </View>
        {canAddMore ? (
          <GroupedAccountMultiSelect
            title={t('budget.selectAccountsTitle')}
            triggerLabel={t('budget.addDestination')}
            hint={t('budget.selectAccountsHint')}
            accounts={accounts}
            members={members}
            excludeAccountIds={alreadyUsedAccountIds}
            groupBy="type"
            typeLabels={destinationAccountTypeLabels}
            sharedLabel={t('budget.shared')}
            unassignedLabel={t('settings.unnamedUser')}
            closeLabel={t('cancel')}
            confirmLabel={t('done')}
            emptyLabel={t('budget.noAccountsAvailable')}
            maxSelectable={remainingSlots}
            onConfirm={addDestinationsFromPicker}
          />
        ) : null}
      </View>

      {destinations.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
          {t('budget.plannedItems.noDestinationsHint')}
        </Text>
      ) : null}

      {destinations.length === 1 && mode === 'single' ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
          {t('budget.plannedItems.singleDestinationHint')}
        </Text>
      ) : null}

      {destinations.length >= 2 ? (
        <View style={{ gap: spacing(1.5) } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t('budget.plannedItems.allocationMode')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            <Pill label={t('budget.plannedItems.allocationModes.equal_split')} active={mode === 'equal_split'} onPress={disabled ? undefined : () => setMode('equal_split')} />
            <Pill label={t('budget.plannedItems.allocationModes.custom_amount')} active={mode === 'custom_amount'} onPress={disabled ? undefined : () => setMode('custom_amount')} />
            <Pill label={t('budget.plannedItems.allocationModes.custom_percent')} active={mode === 'custom_percent'} onPress={disabled ? undefined : () => setMode('custom_percent')} />
          </View>
        </View>
      ) : null}

      {destinations.map((destination, index) => {
        const usedElsewhere = new Set(
          destinations.filter((other) => other.id !== destination.id).map((other) => other.destinationAccountId),
        );
        const allowedAccountIds = accounts
          .map((account) => account.id)
          .filter((accountId) => accountId !== sourceAccountId && !usedElsewhere.has(accountId));
        const browseMode = browseModeByRow[destination.id] ?? 'accounts';
        const previewAmount = mode === 'equal_split' ? equalSplitPreview[index] : null;

        return (
          <View
            key={destination.id}
            style={{
              gap: spacing(2),
              padding: spacing(2.5),
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            } as any}
          >
            {destinations.length > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                  {t('budget.destinationAccountIndex', { index: index + 1 })}
                </Text>
                {!disabled ? (
                  <Pressable
                    onPress={() => removeDestination(destination.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('budget.removeDestination')}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
                  </Pressable>
                ) : null}
              </View>
            ) : !disabled ? (
              <View style={{ alignItems: 'flex-end' } as any}>
                <Pressable
                  onPress={() => removeDestination(destination.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('budget.removeDestination')}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            ) : null}

            <AccountBrowseModeToggle mode={browseMode} onChange={(next) => setBrowseModeByRow((prev) => ({ ...prev, [destination.id]: next }))} />

            {browseMode === 'pots' ? (
              <PotDestinationBrowser
                accountNameMap={accountNameMap}
                onSelectAccount={(accountId) => updateDestination(destination.id, { destinationAccountId: accountId })}
              />
            ) : (
              <GroupedAccountSelect
                label={t('budget.destinationAccount')}
                accounts={accounts}
                members={members}
                value={destination.destinationAccountId}
                placeholder={t('budget.selectDestinationAccount')}
                hint={t('budget.destinationAccountHint')}
                groupBy="type"
                typeLabels={destinationAccountTypeLabels}
                allowedAccountIds={allowedAccountIds}
                sharedLabel={t('budget.shared')}
                unassignedLabel={t('settings.unnamedUser')}
                closeLabel={t('cancel')}
                onChange={(accountId) => updateDestination(destination.id, { destinationAccountId: accountId })}
                disabled={disabled}
              />
            )}

            {mode === 'equal_split' ? (
              <Field
                label={t('budget.allocationAmount')}
                value={previewAmount != null ? String(previewAmount) : ''}
                onChangeText={() => {}}
                keyboardType="numeric"
                editable={false}
                style={{ opacity: 0.6 } as any}
              />
            ) : mode === 'custom_amount' ? (
              <Field
                label={t('budget.allocationAmount')}
                value={destination.amount}
                onChangeText={(value) => updateDestination(destination.id, { amount: value })}
                keyboardType="numeric"
                placeholder="0.00"
                editable={!disabled}
              />
            ) : mode === 'custom_percent' ? (
              <Field
                label="%"
                value={destination.percent}
                onChangeText={(value) => updateDestination(destination.id, { percent: value })}
                keyboardType="numeric"
                placeholder="0"
                editable={!disabled}
              />
            ) : null}

            <CategoryPicker
              label={t('budget.allocationCategory')}
              placeholder={t('budget.allocationCategoryPlaceholder')}
              hint={t('budget.allocationCategoryHint')}
              categories={categories}
              selectedId={destination.categoryId}
              clearLabel={t('budget.allocationCategoryNone')}
              onChange={(categoryId) => updateDestination(destination.id, { categoryId })}
              disabled={disabled}
            />
          </View>
        );
      })}

      {destinations.length >= 2 ? <AllocationSummary mode={mode} totalAmount={totalAmount} destinations={destinations} /> : null}
    </View>
  );
}
