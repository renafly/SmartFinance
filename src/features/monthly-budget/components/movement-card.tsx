import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { PotDestinationBrowser } from '@/features/planned-items/components/pot-destination-picker';
import { formatPlannedItemRecurrenceSummary } from '@/features/planned-items/utils';
import type { PlannedItemDraft } from '@/features/planned-items/types';
import type { BudgetAccountLike, BudgetMemberLike } from '../types';
import { destinationAmount, isRowDueInMonth, newDestinationDraft, rowAmount, validateRow, type PlanRow } from '../monthly-plan';
import { FieldLabel, PLAN_CONTROL_HEIGHT, ScheduleFields, cleanAmountInput, usePlanInputStyle, usePlanTriggerStyle } from './plan-fields';

type Shared = {
  month: string;
  monthLabel: string;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  accountNameMap: Map<string, string>;
  /** accountId -> owner's name ("Shared" for household accounts). */
  accountOwnerMap: Map<string, string>;
};

// ------------------------------------------------------------
// Compact card: "Investing  €600 / Account A → 3 accounts [⌄]"
// ------------------------------------------------------------

export type MovementCardProps = Shared & {
  row: PlanRow;
  /** Read-only (a saved month): no edit action. */
  readOnly?: boolean;
  onEdit?: () => void;
};

export function MovementCard({ row, month, monthLabel, accountNameMap, accountOwnerMap, readOnly, onEdit }: MovementCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [expanded, setExpanded] = useState(false);

  const draft = row.draft;
  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);
  const destinations = draft.destinations;
  const withOwner = (accountId: string) => {
    const name = accountNameMap.get(accountId) ?? '';
    const owner = accountOwnerMap.get(accountId);
    return owner ? `${name} (${owner})` : name;
  };
  const fromName = draft.sourceAccountId ? withOwner(draft.sourceAccountId) : t('budget.selectSourceAccount');
  const toSummary =
    destinations.length === 1 ? withOwner(destinations[0].destinationAccountId) : t('budget.plan.nAccounts', { count: destinations.length });
  const isDue = isRowDueInMonth(row, month);
  const statusNote = readOnly
    ? null
    : !draft.isActive
      ? t('budget.plan.paused')
      : draft.isEstimate
        ? t('budget.plan.estimateNote')
        : !isDue
          ? t('budget.plan.notThisMonth', { month: monthLabel, schedule: formatPlannedItemRecurrenceSummary(draft) })
          : draft.recurrenceType !== 'monthly'
            ? formatPlannedItemRecurrenceSummary(draft)
            : null;
  const dimmed = !readOnly && (!draft.isActive || !isDue || draft.isEstimate);

  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, overflow: 'hidden' } as any}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(3), paddingVertical: spacing(2.5), opacity: pressed ? 0.8 : dimmed ? 0.6 : 1 }]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: spacing(0.5) } as any}>
          <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold), fontSize: typography.fontSize[15] } as any} numberOfLines={1}>
            {draft.name || t('budget.plan.unnamedMovement')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any} numberOfLines={1}>
            {`${fromName} → ${toSummary}`}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold), fontSize: typography.fontSize[16] } as any}>{money(rowAmount(row))}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>

      {expanded ? (
        <View style={{ gap: spacing(1.5), paddingHorizontal: spacing(3), paddingBottom: spacing(3) } as any}>
          {destinations.map((destination) => (
            <View key={destination.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2), paddingLeft: spacing(3) } as any}>
              <Text style={{ flex: 1, color: colors.text, fontSize: typography.fontSize[14] } as any} numberOfLines={1}>
                {accountNameMap.get(destination.destinationAccountId) ?? ''}
                {accountOwnerMap.get(destination.destinationAccountId) ? (
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{`  ·  ${accountOwnerMap.get(destination.destinationAccountId)}`}</Text>
                ) : null}
              </Text>
              <Text style={{ color: colors.text, fontSize: typography.fontSize[14], fontWeight: String(typography.fontWeight.semibold) } as any}>
                {money(destinationAmount(destination))}
              </Text>
            </View>
          ))}
          {statusNote ? <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], paddingLeft: spacing(3) } as any}>{statusNote}</Text> : null}
          {!readOnly && onEdit ? (
            <Pressable onPress={onEdit} accessibilityRole="button" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingLeft: spacing(3), paddingTop: spacing(1) } as any}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.plan.editMovement')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------
// Editor: Name / From / Move to (destination + amount lines) / Total / Save
// ------------------------------------------------------------

export type MovementEditorProps = Shared & {
  /** The row being edited (a copy is edited locally; nothing changes until Save). */
  row: PlanRow;
  isNew: boolean;
  categories: CategoryPickerCategory[];
  isSaving: boolean;
  onSave: (row: PlanRow) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function MovementEditor({ row, isNew, month, monthLabel, accounts, members, accountNameMap, categories, isSaving, onSave, onCancel, onDelete }: MovementEditorProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const inputStyle = usePlanInputStyle();
  const triggerStyle = usePlanTriggerStyle();

  const [draft, setDraft] = useState<PlannedItemDraft>(() => ({ ...row.draft, destinations: row.draft.destinations.map((destination) => ({ ...destination })) }));
  const [showIssues, setShowIssues] = useState(false);
  const [showPots, setShowPots] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const editedRow: PlanRow = { ...row, draft };
  const issues = validateRow(editedRow);
  const total = rowAmount(editedRow);
  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);

  function patch(next: Partial<PlannedItemDraft>) {
    // Editing an older "estimate" movement turns it into a normal one that gets posted.
    setDraft((current) => ({ ...current, ...next, isEstimate: false }));
  }
  function patchDestination(index: number, next: Partial<PlannedItemDraft['destinations'][number]>) {
    setDraft((current) => ({
      ...current,
      isEstimate: false,
      destinations: current.destinations.map((destination, position) => (position === index ? { ...destination, ...next } : destination)),
    }));
  }
  function addDestination(accountId = '') {
    setDraft((current) => {
      // Picking a pot fills the first empty line rather than adding another.
      const emptyIndex = accountId ? current.destinations.findIndex((destination) => !destination.destinationAccountId) : -1;
      if (emptyIndex >= 0) {
        return { ...current, destinations: current.destinations.map((destination, position) => (position === emptyIndex ? { ...destination, destinationAccountId: accountId } : destination)) };
      }
      return { ...current, destinations: [...current.destinations, newDestinationDraft(accountId)] };
    });
  }
  function removeDestination(index: number) {
    setDraft((current) => ({ ...current, destinations: current.destinations.filter((_, position) => position !== index) }));
  }

  function handleSave() {
    if (issues.length > 0) {
      setShowIssues(true);
      return;
    }
    onSave(editedRow);
  }

  const usedAccountIds = new Set(draft.destinations.map((destination) => destination.destinationAccountId).filter(Boolean));
  const amountWidth = responsive.isPhone ? 110 : 140;

  return (
    <View style={{ gap: spacing(3), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surfaceMuted } as any}>
      <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold), fontSize: typography.fontSize[15] } as any}>
        {isNew ? t('budget.plan.newMovementTitle') : t('budget.plan.editMovementTitle')}
      </Text>

      <View style={{ gap: spacing(1.5) } as any}>
        <FieldLabel>{t('budget.plan.nameLabel')}</FieldLabel>
        <TextInput
          value={draft.name}
          onChangeText={(value) => patch({ name: value })}
          placeholder={t('budget.plan.movementNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={inputStyle}
        />
      </View>

      <View style={{ gap: spacing(1.5) } as any}>
        <FieldLabel>{t('budget.plan.moveFrom')}</FieldLabel>
        <GroupedAccountSelect
          hideLabel
          triggerStyle={triggerStyle}
          label={t('budget.plan.moveFrom')}
          accounts={accounts.filter((account) => account.id === draft.sourceAccountId || (!account.is_archived && !usedAccountIds.has(account.id)))}
          members={members}
          value={draft.sourceAccountId}
          placeholder={t('budget.selectSourceAccount')}
          sharedLabel={t('budget.shared')}
          unassignedLabel={t('settings.unnamedUser')}
          closeLabel={t('cancel')}
          onChange={(accountId) => patch({ sourceAccountId: accountId })}
        />
      </View>

      <View style={{ gap: spacing(1.5) } as any}>
        <View style={{ flexDirection: 'row', gap: spacing(2) } as any}>
          <View style={{ flex: 1 } as any}><FieldLabel>{t('budget.plan.moveTo')}</FieldLabel></View>
          <View style={{ width: amountWidth } as any}><FieldLabel>{t('budget.plan.amount')}</FieldLabel></View>
          <View style={{ width: 36 } as any} />
        </View>
        {draft.destinations.map((destination, index) => (
          <View key={destination.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
            <View style={{ flex: 1, minWidth: 0 } as any}>
              <GroupedAccountSelect
                hideLabel
                triggerStyle={triggerStyle}
                label={t('budget.plan.moveTo')}
                accounts={accounts.filter(
                  (account) =>
                    account.id === destination.destinationAccountId ||
                    (!account.is_archived && account.id !== draft.sourceAccountId && !usedAccountIds.has(account.id)),
                )}
                members={members}
                value={destination.destinationAccountId}
                placeholder={t('budget.plan.selectDestination')}
                sharedLabel={t('budget.shared')}
                unassignedLabel={t('settings.unnamedUser')}
                closeLabel={t('cancel')}
                onChange={(accountId) => patchDestination(index, { destinationAccountId: accountId })}
              />
            </View>
            <View style={{ width: amountWidth } as any}>
              <TextInput
                value={destination.amount}
                onChangeText={(value) => patchDestination(index, { amount: cleanAmountInput(value) })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t('budget.plan.amount')}
                style={[inputStyle, { textAlign: 'right', fontWeight: String(typography.fontWeight.bold) }]}
              />
            </View>
            <Pressable
              onPress={() => removeDestination(index)}
              disabled={draft.destinations.length <= 1}
              accessibilityRole="button"
              accessibilityLabel={t('budget.plan.removeDestination')}
              style={({ pressed }) => [{ width: 36, height: PLAN_CONTROL_HEIGHT, alignItems: 'center', justifyContent: 'center', opacity: draft.destinations.length <= 1 ? 0.3 : pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), alignItems: 'center' } as any}>
          <Pressable onPress={() => addDestination()} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingVertical: spacing(1.5) } as any}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.addDestination')}</Text>
          </Pressable>
          <Pressable onPress={() => setShowPots((current) => !current)} accessibilityRole="button" style={{ paddingVertical: spacing(1.5) } as any}>
            <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.semibold) } as any}>{showPots ? t('budget.plan.hidePots') : t('budget.plan.pickPot')}</Text>
          </Pressable>
        </View>
        {showPots ? <PotDestinationBrowser accountNameMap={accountNameMap} onSelectAccount={(accountId) => addDestination(accountId)} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2), borderTopWidth: 1, borderTopColor: colors.border } as any}>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.movementTotal')}</Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold), fontSize: typography.fontSize[18] } as any}>{money(total)}</Text>
      </View>

      <Pressable onPress={() => setShowMore((current) => !current)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) } as any}>
        <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.plan.moreOptions')}</Text>
      </Pressable>
      {showMore ? (
        <View style={{ gap: spacing(2.5) } as any}>
          <CategoryPicker
            label={t('budget.plan.category')}
            placeholder={t('budget.plannedItems.categoryPlaceholder')}
            categories={categories}
            selectedId={draft.categoryId || null}
            onChange={(categoryId) => patch({ categoryId: categoryId ?? '' })}
          />
          <ScheduleFields draft={draft} month={month} monthLabel={monthLabel} onChange={patch} />
        </View>
      ) : null}

      {showIssues && issues.length > 0 ? (
        <Text style={{ color: colors.destructive, fontSize: typography.fontSize[13] } as any}>{issues.map((issue) => t(`budget.plan.issues.${issue}`)).join(' · ')}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
        {onDelete ? (
          <View style={{ flexGrow: 1, minWidth: 110 } as any}>
            <Button label={t('budget.plan.deleteMovement')} variant="danger" onPress={onDelete} disabled={isSaving} />
          </View>
        ) : null}
        <View style={{ flexGrow: 1, minWidth: 110 } as any}>
          <Button label={t('cancel')} variant="secondary" onPress={onCancel} disabled={isSaving} />
        </View>
        <View style={{ flexGrow: 2, minWidth: 140 } as any}>
          <Button label={isSaving ? t('budget.plan.saving') : t('budget.plan.saveMovement')} onPress={handleSave} disabled={isSaving} />
        </View>
      </View>
    </View>
  );
}
