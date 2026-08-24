import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState, Table, TableCell, TableRow } from "@/components/data-surface";
import { Card, Section, formatCurrency, formatDate } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";

import { useReplenishmentHistory } from "../hooks/useReplenishmentHistory";

export function ReplenishmentHistoryScreen({ onOpenRun }: { onOpenRun: (runId: string) => void }) {
  const { t } = useTranslation("common");
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const historyQuery = useReplenishmentHistory();
  const runs = historyQuery.data ?? [];

  return (
    <Card>
      <Section title={t("replenishments.historyTitle")} subtitle={t("replenishments.historySubtitle", { count: runs.length })}>
        {runs.length === 0 ? (
          <EmptyState title={t("replenishments.historyEmpty")} icon="time-outline" />
        ) : (
          <View style={{ gap: spacing(2) }}>
            <Table
              columns={[
                { label: t("replenishments.historyColumnDate"), flex: 1 },
                { label: t("replenishments.historyColumnTitle"), flex: 2 },
                { label: t("replenishments.historyColumnAmount"), align: "right" },
              ]}
            >
              {runs.map((run: any) => (
                <TableRow key={run.id} onPress={() => onOpenRun(run.id)}>
                  <TableCell flex={1}>{formatDate(run.confirmed_at ?? run.created_at)}</TableCell>
                  <TableCell flex={2}>{run.title ?? t("replenishments.untitledRun")}</TableCell>
                  <TableCell align="right">
                    {displayCurrency(formatCurrency(run.total_amount), hideValues)}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </View>
        )}
      </Section>
    </Card>
  );
}
