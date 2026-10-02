import { Fragment, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Field, Pill, Button, formatCurrency } from "@/components/migrated-page";
import { GroupedAccountSelect } from "@/components/grouped-account-select";
import { DropdownField } from "@/features/transactions/components/dropdown-field";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import {
  allocationsToPercentages,
  createEmptyAllocationDraft,
  distributeEqualSplitAmounts,
  fromCents,
  summarizeAllocations,
  toCents,
  validateAllocations,
  type AllocationDraft,
} from "@/features/transactions/utils/transaction-allocations";

/**
 * The on/off header shared by every optional section of the transaction
 * forms (Split Source, Reimbursed by). Uses React Native's own `Switch`,
 * like the rest of the app's toggles (see cookie-consent-banner.tsx), so
 * the drawn state is always exactly `enabled` -- the previous icon-based
 * switch drew both states with the knob on the same side.
 *
 * The row itself isn't pressable: nesting a pressable row around a Switch
 * would fire both handlers on web and flip the value twice.
 */
export function SectionToggle({
  enabled,
  onToggle,
  label,
  hint,
  icon,
  disabled = false,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing(2),
      } as any}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), flex: 1 } as any}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
        <View style={{ flex: 1 } as any}>
          <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {label}
          </Text>
          {hint ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityState={{ checked: enabled, disabled }}
        disabled={disabled}
        value={enabled}
        onValueChange={onToggle}
      />
    </View>
  );
}

export type AccountLike = {
  id: string;
  name: string;
  type: string;
  current_balance?: number | null;
  balance?: number | null;
  owner_profile_id: string | null;
};

export type MemberLike = {
  userId: string;
  fullName: string | null;
  email: string | null;
};

export type PotLike = {
  id: string;
  name: string;
};

export type SplitInputMode = "value" | "percentage";

type SplitAllocationsEditorProps<T extends AllocationDraft = AllocationDraft> = {
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  /** Parsed transaction total, in euros. Allocations must sum to exactly this. */
  totalAmount: number;
  accounts: AccountLike[];
  members: MemberLike[];
  pots: PotLike[];
  allocations: T[];
  onChangeAllocations: (allocations: T[]) => void;
  inputMode: SplitInputMode;
  onChangeInputMode: (mode: SplitInputMode) => void;
  accountTypeLabels: Record<string, string>;
  sharedLabel: string;
  unassignedLabel: string;
  closeLabel: string;
  /**
   * A "split" only means something with at least two sources, so this
   * defaults to 2 -- pass 1 to reuse this same editor for a set where a
   * single source is normal (e.g. reimbursements, see
   * reimbursement-section.tsx), forwarded to validateAllocations/
   * summarizeAllocations unchanged.
   */
  minAllocations?: number;
  /**
   * i18n key prefix for every string this editor owns (toggle, pills,
   * summary, errors...). Defaults to "transactions.split" so the existing
   * Split Source usage is unaffected; a caller reusing this component for
   * a different concept (reimbursements: "transactions.reimbursementSplit")
   * passes its own prefix instead of forking the component. See
   * src/locales/en/common.json for both key sets.
   */
  copyPrefix?: string;
  /** Allow several rows to target the same account/pot (reimbursements: two payers repaying into one account). Defaults to false -- a funding split can't draw from one account twice. */
  allowDuplicateTargets?: boolean;
  /** Overrides the default empty-account-row factory when T carries extra required fields (e.g. a reimbursement row's payerName). */
  createEmptyAllocation?: () => T;
  /** Rendered once, right after the toggle, only while enabled -- e.g. a reimbursement's own "expected total" field, which a plain split doesn't need since its total is already the transaction amount. */
  renderExtra?: () => ReactNode;
  /** Rendered inside every row's card, right after its header -- e.g. a reimbursement row's payer-name field. */
  renderRowExtra?: (allocation: T, update: (patch: Partial<T>) => void) => ReactNode;
  /**
   * Hides each row's account/pot picker -- for a caller that fixes the
   * target itself (reimbursements always land in the expense's own
   * "Paid from" account, see reimbursement-section.tsx).
   */
  hideTargetPicker?: boolean;
  /** Icon beside the toggle label. */
  toggleIcon?: keyof typeof Ionicons.glyphMap;
  /** Disables the on/off switch (e.g. while the saved state is still loading). */
  toggleDisabled?: boolean;
};

function usedTargetKeys<T extends AllocationDraft>(allocations: T[], excludeId: string): Set<string> {
  const keys = new Set<string>();
  for (const allocation of allocations) {
    if (allocation.id === excludeId) continue;
    if (allocation.sourceType === "account" && allocation.accountId) {
      keys.add(`account:${allocation.accountId}`);
    }
    if (allocation.sourceType === "pot" && allocation.potId) {
      keys.add(`pot:${allocation.potId}`);
    }
  }
  return keys;
}

/**
 * "Split source" toggle plus, when enabled, the repeatable
 * account/pot allocation rows and the live Allocated/Remaining summary.
 * `amount` on each AllocationDraft is always the source of truth --
 * switching `inputMode` only changes which unit a row's Field shows/edits,
 * it never transforms the underlying data, so toggling back and forth
 * never loses the current distribution (per docs/split-transactions-plan.md §2.4).
 */
export function SplitAllocationsEditor<T extends AllocationDraft = AllocationDraft>({
  enabled,
  onToggleEnabled,
  totalAmount,
  accounts,
  members,
  pots,
  allocations,
  onChangeAllocations,
  inputMode,
  onChangeInputMode,
  accountTypeLabels,
  sharedLabel,
  unassignedLabel,
  closeLabel,
  minAllocations = 2,
  copyPrefix = "transactions.split",
  allowDuplicateTargets = false,
  createEmptyAllocation,
  renderExtra,
  renderRowExtra,
  hideTargetPicker = false,
  toggleIcon = "git-branch-outline",
  toggleDisabled = false,
}: SplitAllocationsEditorProps<T>) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number) => displayCurrency(formatCurrency(value), hideValues);

  const totalCents = toCents(totalAmount);
  const summary = summarizeAllocations(totalAmount, allocations, { minAllocations });
  const errors = validateAllocations(totalAmount, allocations, { minAllocations, allowDuplicateTargets });
  const percentages = allocationsToPercentages(totalAmount, allocations);

  // patch is typed against the base AllocationDraft (not Partial<T>) because
  // TS can't verify a plain object literal satisfies Partial<T> for a
  // generic T -- every call site here only ever patches base
  // AllocationDraft fields (sourceType/accountId/potId/amount); the single
  // cast below is where T-specific extra fields (passed in via
  // renderRowExtra's own `update` callback, which is still typed
  // Partial<T> in the props) get folded back in.
  function updateAllocation(id: string, patch: Partial<AllocationDraft>) {
    onChangeAllocations(
      allocations.map((allocation) => (allocation.id === id ? ({ ...allocation, ...patch } as T) : allocation)),
    );
  }

  function addAllocation() {
    const next = createEmptyAllocation
      ? createEmptyAllocation()
      : (createEmptyAllocationDraft("account") as T);
    onChangeAllocations([...allocations, next]);
  }

  function removeAllocation(id: string) {
    onChangeAllocations(allocations.filter((allocation) => allocation.id !== id));
  }

  function distributeEqually() {
    if (allocations.length === 0) return;
    const amounts = distributeEqualSplitAmounts(totalAmount, allocations.length);
    onChangeAllocations(
      allocations.map((allocation, index) => ({ ...allocation, amount: amounts[index] ?? 0 })),
    );
  }

  return (
    <View style={{ gap: spacing(2.5) } as any}>
      <SectionToggle
        enabled={enabled}
        onToggle={onToggleEnabled}
        label={t(`${copyPrefix}.toggleLabel`)}
        hint={t(`${copyPrefix}.toggleHint`)}
        icon={toggleIcon}
        disabled={toggleDisabled}
      />

      {enabled ? (
        <Fragment>
          {renderExtra ? renderExtra() : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) } as any}>
            <Pill
              label={t(`${copyPrefix}.inputModeValue`)}
              active={inputMode === "value"}
              onPress={() => onChangeInputMode("value")}
            />
            <Pill
              label={t(`${copyPrefix}.inputModePercentage`)}
              active={inputMode === "percentage"}
              onPress={() => onChangeInputMode("percentage")}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(2) } as any}>
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t(`${copyPrefix}.breakdownTitle`)}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing(2) } as any}>
              <Button label={t(`${copyPrefix}.distributeEqually`)} onPress={distributeEqually} variant="secondary" />
              <Button label={t(`${copyPrefix}.addSource`)} onPress={addAllocation} variant="secondary" />
            </View>
          </View>

          {allocations.map((allocation, index) => {
            const usedKeys = allowDuplicateTargets ? new Set<string>() : usedTargetKeys(allocations, allocation.id);
            const availableAccounts = accounts.filter(
              (account) => account.id === allocation.accountId || !usedKeys.has(`account:${account.id}`),
            );
            const availablePots = pots.filter(
              (pot) => pot.id === allocation.potId || !usedKeys.has(`pot:${pot.id}`),
            );
            const percentage = percentages[index] ?? 0;

            return (
              <View
                key={allocation.id}
                style={{
                  gap: spacing(2),
                  padding: spacing(2.5),
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                } as any}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(2) } as any}>
                  <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                    {t(`${copyPrefix}.sourceIndex`, { index: index + 1 })}
                  </Text>
                  {allocations.length > 1 ? (
                    <Pressable
                      onPress={() => removeAllocation(allocation.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t(`${copyPrefix}.removeSource`)}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
                    </Pressable>
                  ) : null}
                </View>

                {renderRowExtra
                  ? renderRowExtra(allocation, (patch) => updateAllocation(allocation.id, patch))
                  : null}

                {hideTargetPicker ? null : (
                <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) } as any}>
                  <Pill
                    label={t(`${copyPrefix}.sourceTypeAccount`)}
                    active={allocation.sourceType === "account"}
                    onPress={() => updateAllocation(allocation.id, { sourceType: "account", potId: null })}
                  />
                  <Pill
                    label={t(`${copyPrefix}.sourceTypePot`)}
                    active={allocation.sourceType === "pot"}
                    onPress={() => updateAllocation(allocation.id, { sourceType: "pot", accountId: null })}
                  />
                </View>

                {allocation.sourceType === "account" ? (
                  <GroupedAccountSelect
                    label={t(`${copyPrefix}.selectAccount`)}
                    accounts={availableAccounts}
                    members={members}
                    value={allocation.accountId ?? ""}
                    placeholder={t(`${copyPrefix}.selectAccount`)}
                    onChange={(accountId) => updateAllocation(allocation.id, { accountId })}
                    closeLabel={closeLabel}
                    sharedLabel={sharedLabel}
                    unassignedLabel={unassignedLabel}
                    typeLabels={accountTypeLabels}
                  />
                ) : availablePots.length > 0 ? (
                  <DropdownField
                    label={t(`${copyPrefix}.selectPot`)}
                    valueLabel={
                      pots.find((pot) => pot.id === allocation.potId)?.name ?? t(`${copyPrefix}.selectPot`)
                    }
                    placeholder={t(`${copyPrefix}.selectPot`)}
                    hint={t(`${copyPrefix}.selectPotHint`)}
                    selectedKey={allocation.potId ?? undefined}
                    onChange={(potId) => updateAllocation(allocation.id, { potId })}
                    options={availablePots.map((pot) => ({ key: pot.id, label: pot.name }))}
                  />
                ) : (
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
                    {t(`${copyPrefix}.noPots`)}
                  </Text>
                )}

                </>
                )}

                {inputMode === "value" ? (
                  <Field
                    label={t(`${copyPrefix}.amountLabel`)}
                    value={allocation.amount ? String(allocation.amount) : ""}
                    onChangeText={(value) =>
                      updateAllocation(allocation.id, { amount: Number(value.replace(",", ".")) || 0 })
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                ) : (
                  <Field
                    label={t(`${copyPrefix}.percentageLabel`)}
                    value={allocation.amount ? String(percentage) : ""}
                    onChangeText={(value) => {
                      const parsedPercentage = Number(value.replace(",", ".")) || 0;
                      const amount = fromCents(Math.round((parsedPercentage / 100) * totalCents));
                      updateAllocation(allocation.id, { amount });
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                )}
              </View>
            );
          })}

          <View
            style={{
              gap: spacing(1.5),
              padding: spacing(3),
              borderRadius: radius.lg,
              borderWidth: summary.isComplete ? 1 : 2,
              borderColor: summary.isComplete ? colors.border : summary.isOverAllocated ? colors.destructive : colors.warning,
              backgroundColor: summary.isComplete ? colors.surface : summary.isOverAllocated ? colors.destructiveSoft : colors.warningSoft,
            } as any}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any}>
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                {t(`${copyPrefix}.total`)}
              </Text>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
                {money(fromCents(summary.totalCents))}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any}>
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                {t(`${copyPrefix}.allocated`)}
              </Text>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
                {money(fromCents(summary.allocatedCents))}
              </Text>
            </View>
            {summary.isComplete ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(1.5) } as any}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={{ color: colors.success, fontWeight: String(typography.fontWeight.semibold) } as any}>
                  {t(`${copyPrefix}.complete`)}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(1.5) } as any}>
                <Ionicons
                  name="warning"
                  size={16}
                  color={summary.isOverAllocated ? colors.destructive : colors.warning}
                />
                <Text
                  style={{
                    flex: 1,
                    color: summary.isOverAllocated ? colors.destructive : colors.warning,
                    fontWeight: String(typography.fontWeight.extraBold),
                  } as any}
                >
                  {summary.isOverAllocated
                    ? t(`${copyPrefix}.overAllocated`, { amount: money(fromCents(Math.abs(summary.remainingCents))) })
                    : t(`${copyPrefix}.remaining`, { amount: money(fromCents(Math.abs(summary.remainingCents))) })}
                </Text>
              </View>
            )}
          </View>

          {errors.length > 0 ? (
            <View style={{ gap: spacing(1) } as any}>
              {errors.map((error) => (
                <Text key={error} style={{ color: colors.destructive, fontSize: typography.fontSize[12] } as any}>
                  {t(`${copyPrefix}.errors.${error}`)}
                </Text>
              ))}
            </View>
          ) : null}
        </Fragment>
      ) : null}
    </View>
  );
}
