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
              {run.transactions.map((transaction: any) => (
                <View key={transaction.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: colors.text }}>{transaction.account?.name ?? ""}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                      {formatDate(transaction.transaction_date)}
                      {transaction.category ? ` · ${transaction.category.name}` : ""}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                    {displayCurrency(formatCurrency(transaction.amount), hideValues)}
                  </Text>
                </View>
              ))}
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

      <Button label={t("close")} variant="secondary" onPress={onClose} />
    </>
  );
}
