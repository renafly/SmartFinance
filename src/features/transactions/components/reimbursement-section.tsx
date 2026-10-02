import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Button, Field, formatCurrency, formatDate } from "@/components/migrated-page";
import { DatePickerField } from "@/components/date-picker-field";
import { getLocalCalendarDate } from "@/features/transactions/utils/transaction-create-form";
import {
  SectionToggle,
  SplitAllocationsEditor,
  type AccountLike,
  type MemberLike,
  type PotLike,
  type SplitInputMode,
} from "@/features/transactions/components/split-allocations-editor";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { createAllocationDraftId } from "@/features/transactions/utils/transaction-allocations";
import {
  createEmptyReimbursementDraft,
  validateReimbursementDraft,
  type ReimbursementDraft,
  type StagedReimbursement,
} from "@/features/transactions/utils/reimbursements";

/**
 * "Reimbursement" section for the expense create/edit form. See
 * docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2 and
 * supabase/migrations/20260901002500_reimbursement_allocations.sql.
 *
 * Two modes, matching how the create vs. edit transaction forms work in
 * src/app/(protected)/transactions.tsx:
 *  - "draft": the transaction doesn't exist yet (create flow, wizard step
 *    1). This mode is now a thin wrapper around the exact same
 *    SplitAllocationsEditor component the Split Source step (step 2, see
 *    "accounts" step) uses -- same toggle, same equal-split/percentage/
 *    add-remove-source UX, same validateAllocations/summarizeAllocations
 *    math -- reused via its `minAllocations`/`copyPrefix`/
 *    `createEmptyAllocation`/`renderExtra`/`renderRowExtra` extension
 *    points rather than reimplemented. The one thing a reimbursement needs
 *    that a split doesn't is its own "expected total" (a reimbursement can
 *    be partial or exceed the expense -- it isn't pinned to the expense's
 *    own amount the way a funding split is), so that's the `renderExtra`
 *    field, and every row also gets a payer-name field via
 *    `renderRowExtra`. The caller is responsible for persisting the rows
 *    (via transactionReimbursementsService.createReimbursement) once the
 *    transaction itself has been created and has an id -- the same
 *    after-create pattern already used for split allocations.
 *  - "staged": the transaction already has an id (edit flow). The
 *    caller loads the saved rows into local state and passes them in as
 *    `value`; every add/edit/remove here only changes that local list, and
 *    the caller writes the difference when the whole transaction is saved
 *    (see diffStagedReimbursements), exactly like the Split Source editor
 *    beside it -- so Cancel really discards reimbursement changes too.
 *    Each row records a source account/pot and a "received on" date via
 *    the small inline add-row form, which doubles as the edit form (pencil
 *    icon). Removing asks for confirmation. On save, an account
 *    reimbursement also gets a linked income transaction server-side, so
 *    the money shows up in its balance (see
 *    20260929000000_reimbursement_income_transactions.sql).
 *
 * The Original / Reimbursed / Effective summary is shown by the
 * surrounding PaymentBreakdownSection, not here.
 */
type ReimbursementSectionSharedProps = {
  originalAmount: number;
  /**
   * The expense's own "Paid from" account. A reimbursement always goes
   * back into it (the Split Source editor and reimbursements are mutually
   * exclusive, so there's exactly one), so rows never pick a target.
   */
  fixedAccountId: string | null;
  accounts: AccountLike[];
  members: MemberLike[];
  pots: PotLike[];
  accountTypeLabels: Record<string, string>;
  sharedLabel: string;
  unassignedLabel: string;
  closeLabel: string;
};

type ReimbursementSectionProps = ReimbursementSectionSharedProps &
  (
    | {
        mode: "draft";
        enabled: boolean;
        onToggleEnabled: (enabled: boolean) => void;
        targetAmount: string;
        onChangeTargetAmount: (value: string) => void;
        inputMode: SplitInputMode;
        onChangeInputMode: (mode: SplitInputMode) => void;
        value: ReimbursementDraft[];
        onChange: (next: ReimbursementDraft[]) => void;
      }
    | {
        mode: "staged";
        /** Same on/off switch as Split Source; off hides the controls and saving removes the rows. */
        enabled: boolean;
        onToggleEnabled: (enabled: boolean) => void;
        /** True while the saved rows are still loading. */
        toggleDisabled?: boolean;
        value: StagedReimbursement[];
        onChange: (next: StagedReimbursement[]) => void;
      }
  );

export function ReimbursementSection(props: ReimbursementSectionProps) {
  if (props.mode === "draft") {
    return <DraftReimbursementSection {...props} />;
  }
  return <StagedReimbursementSection {...props} />;
}

function DraftReimbursementSection(
  props: ReimbursementSectionSharedProps & Extract<ReimbursementSectionProps, { mode: "draft" }>,
) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const targetAmount = Number(props.targetAmount.replace(",", ".")) || 0;
  const rows = props.value.map((row) => ({
    ...row,
    sourceType: "account" as const,
    accountId: props.fixedAccountId || null,
    potId: null,
  }));

  return (
    <View style={styles.container}>
      <SplitAllocationsEditor<ReimbursementDraft>
        enabled={props.enabled}
        onToggleEnabled={props.onToggleEnabled}
        totalAmount={targetAmount}
        accounts={props.accounts}
        members={props.members}
        pots={props.pots}
        allocations={rows}
        onChangeAllocations={props.onChange}
        hideTargetPicker
        toggleIcon="return-down-back-outline"
        inputMode={props.inputMode}
        onChangeInputMode={props.onChangeInputMode}
        accountTypeLabels={props.accountTypeLabels}
        sharedLabel={props.sharedLabel}
        unassignedLabel={props.unassignedLabel}
        closeLabel={props.closeLabel}
        minAllocations={1}
        allowDuplicateTargets
        copyPrefix="transactions.reimbursementSplit"
        createEmptyAllocation={() => createEmptyReimbursementDraft("account")}
        renderExtra={() => (
          <>
          <IntoAccountNote accounts={props.accounts} accountId={props.fixedAccountId} />
          <Field
            label={t("transactions.reimbursements.expectedAmount")}
            value={props.targetAmount}
            onChangeText={props.onChangeTargetAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          </>
        )}
        renderRowExtra={(allocation, update) => (
          <Field
            label={t("transactions.reimbursements.payerName")}
            value={allocation.payerName}
            onChangeText={(value) => update({ payerName: value })}
            placeholder={t("transactions.reimbursements.payerNamePlaceholder")}
          />
        )}
      />
      {props.enabled && props.value.some((row) => !row.payerName.trim()) ? (
        <Text style={{ color: colors.destructive, fontSize: 12 }}>
          {t("transactions.reimbursementSplit.errors.missing_payer_name")}
        </Text>
      ) : null}
    </View>
  );
}

function StagedReimbursementSection(
  props: ReimbursementSectionSharedProps & Extract<ReimbursementSectionProps, { mode: "staged" }>,
) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedOn, setReceivedOn] = useState(() => getLocalCalendarDate());
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const rows = props.value;
  const editingRow = editingId ? rows.find((row) => row.key === editingId) ?? null : null;


  function resetForm() {
    setEditingId(null);
    setPayerName("");
    setAmount("");
    setReceivedOn(getLocalCalendarDate());
    setFormError(null);
  }

  function startEdit(row: StagedReimbursement) {
    setConfirmRemoveId(null);
    setEditingId(row.key);
    setPayerName(row.payerName);
    setAmount(String(row.amount));
    setReceivedOn(row.receivedOn ?? getLocalCalendarDate());
    setFormError(null);
  }

  function submit() {
    const parsedAmount = Number(amount.replace(",", "."));
    const errors = validateReimbursementDraft({
      payerName,
      amount: parsedAmount,
      sourceType: "account",
      accountId: props.fixedAccountId,
      potId: null,
    });
    if (errors.length > 0) {
      setFormError(
        errors.includes("missing_payer_name")
          ? t("transactions.reimbursements.errorMissingName")
          : errors.includes("missing_source")
            ? t("transactions.reimbursementSplit.errors.missing_target")
            : t("transactions.reimbursements.errorInvalidAmount"),
      );
      return;
    }
    setFormError(null);

    const fields = {
      payerName: payerName.trim(),
      amount: parsedAmount,
      receivedOn,
      sourceType: "account" as const,
      accountId: props.fixedAccountId,
      potId: null,
    };
    if (editingId) {
      props.onChange(rows.map((row) => (row.key === editingId ? { ...row, ...fields } : row)));
    } else {
      props.onChange([
        ...rows,
        { key: createAllocationDraftId(), id: null, note: null, ...fields },
      ]);
    }
    resetForm();
  }

  function removeRow(key: string) {
    props.onChange(rows.filter((row) => row.key !== key));
    setConfirmRemoveId(null);
    if (editingId === key) resetForm();
  }

  const toggle = (
    <SectionToggle
      enabled={props.enabled}
      onToggle={props.onToggleEnabled}
      label={t("transactions.reimbursementSplit.toggleLabel")}
      hint={t("transactions.reimbursementSplit.toggleHint")}
      icon="return-down-back-outline"
      disabled={props.toggleDisabled}
    />
  );
  if (!props.enabled) return toggle;

  return (
    <View style={styles.container}>
      {toggle}
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t("transactions.reimbursements.hint")} {t("transactions.reimbursements.pendingHint")}
      </Text>

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map((row) => (
            <View
              key={row.key}
              style={[
                styles.rowCard,
                { borderColor: row.key === editingId ? colors.primary : colors.border },
              ]}
            >
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={{ color: colors.text }}>{row.payerName}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {[
                      row.receivedOn
                        ? t("transactions.reimbursements.receivedOnValue", { date: formatDate(row.receivedOn) })
                        : null,
                      row.id === null ? t("transactions.reimbursements.unsavedBadge") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: "600" as any }}>
                  {formatCurrency(row.amount)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("transactions.reimbursements.edit")}
                  onPress={() => startEdit(row)}
                  style={styles.iconButton}
                >
                  <Ionicons name="create-outline" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("transactions.reimbursements.remove")}
                  onPress={() => setConfirmRemoveId(row.key)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
              {confirmRemoveId === row.key ? (
                <View style={{ gap: spacing(1.5) }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {t("transactions.reimbursements.removeConfirm")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: spacing(2), flexWrap: "wrap" } as any}>
                    <Button
                      label={t("cancel")}
                      variant="secondary"
                      onPress={() => setConfirmRemoveId(null)}
                    />
                    <Button
                      label={t("transactions.reimbursements.removeConfirmYes")}
                      variant="danger"
                      onPress={() => removeRow(row.key)}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {editingRow ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {t("transactions.reimbursements.editing", { payer: editingRow.payerName })}
        </Text>
      ) : null}
      <View style={styles.addRow}>
        <View style={styles.addField}>
          <Field
            label={t("transactions.reimbursements.payerName")}
            value={payerName}
            onChangeText={setPayerName}
            placeholder={t("transactions.reimbursements.payerNamePlaceholder")}
          />
        </View>
        <View style={styles.addField}>
          <Field
            label={t("transactions.reimbursements.amount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
        <View style={styles.addField}>
          <DatePickerField
            label={t("transactions.reimbursements.receivedOn")}
            value={receivedOn}
            onChange={setReceivedOn}
            placeholder="DD-MM-YYYY"
          />
        </View>
      </View>
      <IntoAccountNote accounts={props.accounts} accountId={props.fixedAccountId} />
      <View style={{ flexDirection: "row", gap: spacing(2), flexWrap: "wrap" } as any}>
        <Button
          label={
            editingId
              ? t("transactions.reimbursements.applyChanges")
              : t("transactions.reimbursements.add")
          }
          variant="secondary"
          onPress={submit}
        />
        {editingId ? (
          <Button
            label={t("transactions.reimbursements.cancelEdit")}
            variant="secondary"
            onPress={resetForm}
          />
        ) : null}
      </View>
      {formError ? <Text style={{ color: colors.destructive }}>{formError}</Text> : null}
    </View>
  );
}

/** "Received into <Paid from account>" -- the one place a reimbursement's money can land. */
function IntoAccountNote({
  accounts,
  accountId,
}: {
  accounts: AccountLike[];
  accountId: string | null;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const name = accountId ? accounts.find((account) => account.id === accountId)?.name : null;
  return (
    <Text style={{ color: name ? colors.textSecondary : colors.destructive, fontSize: 12 }}>
      {name
        ? t("transactions.paymentBreakdown.receivedInto", { account: name })
        : t("transactions.paymentBreakdown.choosePaidFromFirst")}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing(1.5) },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12 },
  rows: { gap: spacing(1) },
  rowCard: {
    gap: spacing(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
  },
  iconButton: { padding: spacing(0.75) },
  rowInfo: { flex: 1 },
  removeButton: { padding: spacing(0.5) },
  addRow: { gap: spacing(1) },
  addField: { flex: 1 },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing(1),
    gap: spacing(0.5),
  },
  effectiveRow: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
});
