import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/data-surface";
import { Button, Field, formatCurrency } from "@/components/migrated-page";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import {
  computeEffectiveAmount,
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
 * docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2.
 *
 * Two modes, matching how the create vs. edit transaction forms work in
 * src/app/(protected)/transactions.tsx:
 *  - "draft": the transaction doesn't exist yet (create flow). Rows are
 *    plain local state; the caller is responsible for persisting them
 *    (via transactionReimbursementsService.createReimbursement) once the
 *    transaction itself has been created and has an id -- the same
 *    after-create pattern already used for split allocations and feedback
 *    screenshot attachments.
 *  - "live": the transaction already has an id (edit flow). Rows are
 *    loaded from the server and each add/remove takes effect immediately,
 *    independent of the form's own Save button -- there's no "sum must
 *    equal total" invariant to protect here (unlike split allocations), so
 *    there's nothing gained by batching.
 */
type ReimbursementSectionProps = {
  originalAmount: number;
} & (
  | {
      mode: "draft";
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

let draftIdCounter = 0;
function nextDraftId() {
  draftIdCounter += 1;
  return `draft-reimbursement-${Date.now()}-${draftIdCounter}`;
}

export function ReimbursementSection(props: ReimbursementSectionProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isLive = props.mode === "live";
  const liveQuery = useTransactionReimbursements(isLive ? props.transactionId : null, {
    enabled: isLive,
  });
  const createReimbursement = useCreateReimbursement();
  const deleteReimbursement = useDeleteReimbursement();

  const rows: Pick<ReimbursementDraft, "id" | "payerName" | "amount" | "note">[] = isLive
    ? (liveQuery.data ?? []).map((row) => ({
        id: row.id,
        payerName: row.payer_name,
        amount: row.amount,
        note: row.note,
      }))
    : props.value;

  const breakdown = computeEffectiveAmount(props.originalAmount, rows);

  async function addRow() {
    const parsedAmount = Number(amount.replace(",", "."));
    const errors = validateReimbursementDraft({ payerName, amount: parsedAmount });
    if (errors.length > 0) {
      setFormError(
        errors.includes("missing_payer_name")
          ? t("transactions.reimbursements.errorMissingName")
          : t("transactions.reimbursements.errorInvalidAmount"),
      );
      return;
    }
    setFormError(null);

    if (props.mode === "draft") {
      props.onChange([
        ...props.value,
        { id: nextDraftId(), payerName: payerName.trim(), amount: parsedAmount, note: null },
      ]);
    } else {
      await createReimbursement.mutateAsync({
        household_id: props.householdId,
        transaction_id: props.transactionId,
        payer_name: payerName.trim(),
        amount: parsedAmount,
        created_by: props.createdById,
      });
    }
    setPayerName("");
    setAmount("");
  }

  function removeRow(id: string) {
    if (props.mode === "draft") {
      props.onChange(props.value.filter((row) => row.id !== id));
    } else {
      void deleteReimbursement.mutateAsync({ id, transactionId: props.transactionId });
    }
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
                <Text style={{ color: colors.text }}>{row.payerName}</Text>
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
        <Button
          label={t("transactions.reimbursements.add")}
          variant="secondary"
          onPress={() => void addRow()}
          disabled={isLive && (createReimbursement.isPending || !props.transactionId)}
        />
      </View>
      {formError ? <Text style={{ color: colors.destructive }}>{formError}</Text> : null}

      {rows.length > 0 ? (
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
      ) : null}
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
