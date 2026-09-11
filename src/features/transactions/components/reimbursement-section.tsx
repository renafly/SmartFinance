import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/data-surface";
import { Button, Field, Pill, formatCurrency } from "@/components/migrated-page";
import { GroupedAccountSelect } from "@/components/grouped-account-select";
import { DropdownField } from "@/features/transactions/components/dropdown-field";
import {
  SplitAllocationsEditor,
  type AccountLike,
  type MemberLike,
  type PotLike,
  type SplitInputMode,
} from "@/features/transactions/components/split-allocations-editor";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import type { AllocationSourceType } from "@/features/transactions/utils/transaction-allocations";
import {
  computeEffectiveAmount,
  createEmptyReimbursementDraft,
  validateReimbursementDraft,
  type ReimbursementDraft,
} from "@/features/transactions/utils/reimbursements";
import {
  useCreateReimbursement,
  useDeleteReimbursement,
  useTransactionReimbursements,
} from "@/features/transactions/hooks/useTransactionReimbursements";

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
 *  - "live": the transaction already has an id (edit flow). Rows are
 *    loaded from the server and each add/remove takes effect immediately,
 *    independent of the form's own Save button -- there's no "sum must
 *    equal expected total" invariant enforced here (unlike the draft-mode
 *    editor above), since edit-mode reimbursements have always been
 *    independent add/remove operations, not a single atomically-replaced
 *    set -- so there's nothing gained by batching. Each row still records
 *    a source account/pot, via the same small inline add-row form.
 */
type ReimbursementSectionSharedProps = {
  originalAmount: number;
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
        mode: "live";
        transactionId: string;
        householdId: string;
        createdById: string;
      }
  );

export function ReimbursementSection(props: ReimbursementSectionProps) {
  if (props.mode === "draft") {
    return <DraftReimbursementSection {...props} />;
  }
  return <LiveReimbursementSection {...props} />;
}

function EffectiveAmountSummary({
  originalAmount,
  rows,
}: {
  originalAmount: number;
  rows: readonly Pick<ReimbursementDraft, "amount">[];
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  if (rows.length === 0) return null;

  const breakdown = computeEffectiveAmount(originalAmount, rows);

  return (
    <View style={[styles.summary, { borderColor: colors.border }]}>
      <Text style={{ color: colors.textSecondary }}>
        {t("transactions.reimbursements.originalAmount")}: {formatCurrency(breakdown.originalAmount)}
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        {t("transactions.reimbursements.reimbursedTotal")}: {formatCurrency(breakdown.reimbursedTotal)}
      </Text>
      <View style={styles.effectiveRow}>
        <Text style={{ color: colors.text, fontWeight: "700" as any }}>
          {t("transactions.reimbursements.effectiveAmount")}: {formatCurrency(breakdown.effectiveAmount)}
        </Text>
        {breakdown.isOverReimbursed ? (
          <Badge label={t("transactions.reimbursements.overReimbursedBadge")} tone="success" />
        ) : null}
      </View>
    </View>
  );
}

function DraftReimbursementSection(
  props: ReimbursementSectionSharedProps & Extract<ReimbursementSectionProps, { mode: "draft" }>,
) {
  const { t } = useTranslation("common");
  const targetAmount = Number(props.targetAmount.replace(",", ".")) || 0;

  return (
    <View style={styles.container}>
      <SplitAllocationsEditor<ReimbursementDraft>
        enabled={props.enabled}
        onToggleEnabled={props.onToggleEnabled}
        totalAmount={targetAmount}
        accounts={props.accounts}
        members={props.members}
        pots={props.pots}
        allocations={props.value}
        onChangeAllocations={props.onChange}
        inputMode={props.inputMode}
        onChangeInputMode={props.onChangeInputMode}
        accountTypeLabels={props.accountTypeLabels}
        sharedLabel={props.sharedLabel}
        unassignedLabel={props.unassignedLabel}
        closeLabel={props.closeLabel}
        minAllocations={1}
        copyPrefix="transactions.reimbursementSplit"
        createEmptyAllocation={() => createEmptyReimbursementDraft("account")}
        renderExtra={() => (
          <Field
            label={t("transactions.reimbursements.expectedAmount")}
            value={props.targetAmount}
            onChangeText={props.onChangeTargetAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
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
      <EffectiveAmountSummary originalAmount={props.originalAmount} rows={props.value} />
    </View>
  );
}

function LiveReimbursementSection(
  props: ReimbursementSectionSharedProps & Extract<ReimbursementSectionProps, { mode: "live" }>,
) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceType, setSourceType] = useState<AllocationSourceType>("account");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [potId, setPotId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const liveQuery = useTransactionReimbursements(props.transactionId, { enabled: true });
  const createReimbursement = useCreateReimbursement();
  const deleteReimbursement = useDeleteReimbursement();

  const rows = liveQuery.data ?? [];

  function sourceLabel(row: (typeof rows)[number]): string | null {
    if (row.source_type === "account") {
      return props.accounts.find((account) => account.id === row.account_id)?.name ?? null;
    }
    if (row.source_type === "pot") {
      return props.pots.find((pot) => pot.id === row.pot_id)?.name ?? null;
    }
    return null;
  }

  async function addRow() {
    const parsedAmount = Number(amount.replace(",", "."));
    const errors = validateReimbursementDraft({
      payerName,
      amount: parsedAmount,
      sourceType,
      accountId,
      potId,
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

    await createReimbursement.mutateAsync({
      household_id: props.householdId,
      transaction_id: props.transactionId,
      payer_name: payerName.trim(),
      amount: parsedAmount,
      created_by: props.createdById,
      source_type: sourceType,
      account_id: sourceType === "account" ? accountId : null,
      pot_id: sourceType === "pot" ? potId : null,
    });
    setPayerName("");
    setAmount("");
    setAccountId(null);
    setPotId(null);
  }

  function removeRow(id: string) {
    void deleteReimbursement.mutateAsync({ id, transactionId: props.transactionId });
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t("transactions.reimbursements.title")}
      </Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t("transactions.reimbursements.hint")}
      </Text>

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.id} style={[styles.row, { borderColor: colors.border }]}>
              <View style={styles.rowInfo}>
                <Text style={{ color: colors.text }}>{row.payer_name}</Text>
                {sourceLabel(row) ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t("transactions.reimbursements.fromSource", { source: sourceLabel(row) })}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.primary, fontWeight: "600" as any }}>
                {formatCurrency(row.amount)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("transactions.reimbursements.remove")}
                onPress={() => removeRow(row.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
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
            keyboardType="numeric"
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) } as any}>
        <Pill
          label={t("transactions.reimbursementSplit.sourceTypeAccount")}
          active={sourceType === "account"}
          onPress={() => {
            setSourceType("account");
            setPotId(null);
          }}
        />
        <Pill
          label={t("transactions.reimbursementSplit.sourceTypePot")}
          active={sourceType === "pot"}
          onPress={() => {
            setSourceType("pot");
            setAccountId(null);
          }}
        />
      </View>
      {sourceType === "account" ? (
        <GroupedAccountSelect
          label={t("transactions.reimbursementSplit.selectAccount")}
          accounts={props.accounts}
          members={props.members}
          value={accountId ?? ""}
          placeholder={t("transactions.reimbursementSplit.selectAccount")}
          onChange={setAccountId}
          closeLabel={props.closeLabel}
          sharedLabel={props.sharedLabel}
          unassignedLabel={props.unassignedLabel}
          typeLabels={props.accountTypeLabels}
        />
      ) : props.pots.length > 0 ? (
        <DropdownField
          label={t("transactions.reimbursementSplit.selectPot")}
          valueLabel={
            props.pots.find((pot) => pot.id === potId)?.name ?? t("transactions.reimbursementSplit.selectPot")
          }
          placeholder={t("transactions.reimbursementSplit.selectPot")}
          hint={t("transactions.reimbursementSplit.selectPotHint")}
          selectedKey={potId ?? undefined}
          onChange={setPotId}
          options={props.pots.map((pot) => ({ key: pot.id, label: pot.name }))}
        />
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t("transactions.reimbursementSplit.noPots")}
        </Text>
      )}
      <Button
        label={t("transactions.reimbursements.add")}
        variant="secondary"
        onPress={() => void addRow()}
        disabled={createReimbursement.isPending || !props.transactionId}
      />
      {formError ? <Text style={{ color: colors.destructive }}>{formError}</Text> : null}

      <EffectiveAmountSummary originalAmount={props.originalAmount} rows={rows} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing(1.5) },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12 },
  rows: { gap: spacing(1) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
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
