import { useMemo } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { EmptyState } from "@/components/data-surface";
import { Button, Card, Section, formatCurrency, formatDate } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { useReplenishmentDetail } from "../hooks/useReplenishmentHistory";

export function ReplenishmentDetailScreen({ runId, onClose }: { runId: string; onClose: () => void }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const detailQuery = useReplenishmentDetail(runId);
  const run = detailQuery.data;

  // Resolves a covered transaction's new_sources (set by
  // confirm_replenishment_run under the direct-source-reassignment model --
  // see ReplenishmentWizard/confirm_replenishment_run) into display names,
  // by matching each entry's account_id/pot_id back against this run's own
  // chosen sources (run.sources), which already carry joined account/pot
  // names. Every new_sources entry is guaranteed to match one of them,
  // since the RPC only ever reassigns a covered unit to a source the
  // wizard actually collected in step 3.
  const sourceLabelByAccountId = useMemo(() => {
    const map = new Map<string, string>();
    for (const source of run?.sources ?? []) {
      if (source.resolved_account_id && source.account?.name) {
        map.set(source.resolved_account_id, source.account.name);
      }
    }
    return map;
  }, [run?.sources]);
  const sourceLabelByPotId = useMemo(() => {
    const map = new Map<string, string>();
    for (const source of run?.sources ?? []) {
      if (source.pot_id && source.pot?.name) {
        map.set(source.pot_id, source.pot.name);
      }
    }
    return map;
  }, [run?.sources]);

  function fundedByLabel(newSources: { source_type: string; account_id: string | null; pot_id: string | null }[]): string {
    const labels = newSources.map((source) => {
      if (source.source_type === "pot" && source.pot_id) {
        return sourceLabelByPotId.get(source.pot_id) ?? source.pot_id;
      }
      return (source.account_id && sourceLabelByAccountId.get(source.account_id)) ?? source.account_id ?? "";
    });
    return [...new Set(labels.filter(Boolean))].join(" + ");
  }

  if (detailQuery.isLoading || !run) {
    return (
      <Card>
        <Text style={{ color: colors.textSecondary }}>{t("loading")}</Text>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Section title={run.title ?? t("replenishments.untitledRun")} subtitle={formatDate(run.confirmed_at ?? run.created_at)}>
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[18] }}>
            {displayCurrency(formatCurrency(run.total_amount), hideValues)}
          </Text>
        </Section>
      </Card>

      <Card>
        <Section title={t("replenishments.detailTransactionsTitle")} subtitle={t("replenishments.detailTransactionsSubtitle", { count: run.transactions.length })}>
          {run.transactions.length === 0 ? (
            <EmptyState title={t("replenishments.noTransactions")} icon="receipt-outline" />
          ) : (
            <View style={{ gap: spacing(2) }}>
              {run.transactions.map((transaction: any) => {
                const newSources = Array.isArray(transaction.new_sources) ? transaction.new_sources : [];
                const fundedBy = newSources.length > 0 ? fundedByLabel(newSources) : null;
                return (
                  <View key={transaction.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, paddingRight: spacing(2) }}>
                      <Text style={{ color: colors.text }}>{transaction.transaction?.title ?? transaction.account?.name ?? ""}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                        {[transaction.account?.name, formatDate(transaction.transaction_date), transaction.category?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      {fundedBy ? (
                        <Text style={{ color: colors.primary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold as any }}>
                          {t("replenishments.detailFundedBy", { sources: fundedBy })}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                      {displayCurrency(formatCurrency(transaction.amount), hideValues)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Section>
      </Card>

      <Card>
        <Section title={t("replenishments.detailSourcesTitle")}>
          <View style={{ gap: spacing(2) }}>
            {run.sources.map((source: any) => (
              <View key={source.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: colors.text }}>
                    {source.source_kind === "pot" ? `${t("replenishments.sourceKindPot")} · ` : ""}
                    {source.account?.name ?? source.pot?.name ?? ""}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                    {t("replenishments.suggested")}: {displayCurrency(formatCurrency(source.suggested_amount), hideValues)}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                  {displayCurrency(formatCurrency(source.amount), hideValues)}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      {/* Legacy-only: a run confirmed before the direct-source-reassignment
          model (20260901002700) created real paired transfer transactions
          instead of reassigning each covered transaction's own origin --
          run.transfers is always empty for anything confirmed after that,
          since there's nothing left to show here (see each transaction's
          own "funded by" line above instead). */}
      {run.transfers.length > 0 ? (
        <Card>
          <Section title={t("replenishments.detailTransfersTitle")} subtitle={t("replenishments.previewTransfersSubtitle", { count: run.transfers.length })}>
            <View style={{ gap: spacing(2) }}>
              {run.transfers.map((transfer: any) => (
                <View
                  key={transfer.transferGroupId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(2),
                    borderWidth: 1,
                    borderRadius: spacing(2.5),
                    padding: spacing(3),
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>{transfer.sourceAccountName}</Text>
                  <Ionicons name="arrow-forward-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, flex: 1 }}>{transfer.destinationAccountName}</Text>
                  <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>
                    {displayCurrency(formatCurrency(transfer.amount), hideValues)}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        </Card>
      ) : null}

      <Button label={t("close")} variant="secondary" onPress={onClose} />
    </>
  );
}
