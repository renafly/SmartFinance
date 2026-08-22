import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Card, Section, formatCurrency } from "@/components/migrated-page";
import { EmptyState } from "@/components/data-surface";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import type {
  ReplenishmentDestination,
  ReplenishmentSourceDraft,
  ReplenishmentTransferPreview,
} from "../../types";

// The "Confirm replenishment" action itself now lives in the wizard's fixed
// bottom action bar (see ReplenishmentWizard.tsx's `overlay`), alongside
// Back/Next for every other step, rather than as a button at the bottom of
// this step's own (potentially long) scrollable content -- so this
// component is purely a read-only summary of what confirming will do.
export function TransferPreviewStep({
  destinations,
  sources,
  transactionCount,
  totalAmount,
  transfers,
}: {
  destinations: ReplenishmentDestination[];
  sources: ReplenishmentSourceDraft[];
  transactionCount: number;
  totalAmount: number;
  transfers: ReplenishmentTransferPreview[] | null;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  return (
    <>
      <Card>
        <Section title={t("replenishments.previewSelectedTitle")}>
          <Text style={{ color: colors.text }}>
            {t("replenishments.previewSelectedSummary", {
              count: transactionCount,
              amount: displayCurrency(formatCurrency(totalAmount), hideValues),
            })}
          </Text>
        </Section>
      </Card>

      <Card>
        <Section title={t("replenishments.previewDestinationsTitle")}>
          <View style={{ gap: spacing(2) }}>
            {destinations.map((destination) => (
              <View key={destination.accountId} style={styles.row}>
                <Text style={{ color: colors.text }}>{destination.accountName}</Text>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                  {displayCurrency(formatCurrency(destination.amount), hideValues)}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t("replenishments.previewSourcesTitle")}>
          <View style={{ gap: spacing(2) }}>
            {sources.map((source) => (
              <View key={source.resolvedAccountId} style={styles.row}>
                <Text style={{ color: colors.text }}>{source.label}</Text>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                  {displayCurrency(formatCurrency(source.amount), hideValues)}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section
          title={t("replenishments.previewTransfersTitle")}
          subtitle={
            transfers
              ? t("replenishments.previewTransfersSubtitle", { count: transfers.length })
              : t("replenishments.previewTransfersInvalid")
          }
        >
          {!transfers || transfers.length === 0 ? (
            <EmptyState title={t("replenishments.previewTransfersEmpty")} icon="swap-horizontal-outline" />
          ) : (
            <View style={{ gap: spacing(2) }}>
              {transfers.map((transfer, index) => (
                <View
                  key={`${transfer.sourceAccountId}-${transfer.destinationAccountId}-${index}`}
                  style={[styles.transferRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>{transfer.sourceLabel}</Text>
                  <Ionicons name="arrow-forward-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, flex: 1 }}>{transfer.destinationLabel}</Text>
                  <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>
                    {displayCurrency(formatCurrency(transfer.amount), hideValues)}
                  </Text>
                </View>
              ))}
              <Text style={{ color: colors.textSecondary }}>
                {t("replenishments.previewTransfersTotal", { count: transfers.length })}
              </Text>
            </View>
          )}
        </Section>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: spacing(2.5),
    padding: spacing(3),
  },
});
