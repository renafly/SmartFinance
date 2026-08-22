import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Page } from "@/components/migrated-page";

import { ReplenishmentWizard } from "@/features/replenishments/wizard/ReplenishmentWizard";
import { ReplenishmentHistoryScreen } from "@/features/replenishments/history/ReplenishmentHistoryScreen";
import { ReplenishmentDetailScreen } from "@/features/replenishments/history/ReplenishmentDetailScreen";

type ScreenView =
  | { kind: "wizard" }
  | { kind: "history" }
  | { kind: "detail"; runId: string };

// A single route hosts three "screens" under one drawer entry, the same
// shape transactions.tsx uses for its own wizard/list toggle: the
// replenishment wizard (its own <Page>, since it needs the persistent
// running-total summary bar directly under its title), the run history
// list, and a run's detail view.
export default function ReplenishmentsScreen() {
  const { t } = useTranslation("common");
  const [view, setView] = useState<ScreenView>({ kind: "wizard" });

  if (view.kind === "wizard") {
    return (
      <ReplenishmentWizard
        onDone={() => setView({ kind: "history" })}
        onViewHistory={() => setView({ kind: "history" })}
      />
    );
  }

  if (view.kind === "history") {
    return (
      <Page
        title={t("replenishments.historyTitle")}
        subtitle={t("replenishments.historySubtitlePage")}
        actions={<Button label={t("replenishments.newRun")} onPress={() => setView({ kind: "wizard" })} />}
      >
        <ReplenishmentHistoryScreen onOpenRun={(runId) => setView({ kind: "detail", runId })} />
      </Page>
    );
  }

  return (
    <Page title={t("replenishments.detailTitle")} subtitle={t("replenishments.detailSubtitle")}>
      <ReplenishmentDetailScreen runId={view.runId} onClose={() => setView({ kind: "history" })} />
    </Page>
  );
}
