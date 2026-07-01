import Screen from "@/shared/components/ui/Screen";
import PageHeader from "@/shared/components/ui/PageHeader";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/shared/session";

import DashboardStats from "@/features/dashboard/components/dashboard-stats";
import DashboardGrid from "@/features/dashboard/components/dashboard-grid";

import AccountsCard from "@/features/dashboard/components/accounts-card";
import BudgetsCard from "@/features/dashboard/components/budgets-card";
import GoalsCard from "@/features/dashboard/components/goals-card";
import RecentTransactionsCard from "@/features/dashboard/components/recent-transactions-card";
import RecurringCard from "@/features/dashboard/components/recurring-card";
import UpcomingPaymentsCard from "@/features/dashboard/components/upcoming-payments-card";
import HouseholdCreateCard from "@/features/households/components/household-create-card";
import { useI18n } from "@/shared/i18n";

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: session, isPending: sessionLoading } = useSession();
  const hasHousehold = !!session?.household;

  if (sessionLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      {hasHousehold ? (
        <>
          <DashboardStats />

          <DashboardGrid
            left={
              <>
                <RecentTransactionsCard />
                <AccountsCard />
                <BudgetsCard />
              </>
            }
            right={
              <>
                <GoalsCard />
                <UpcomingPaymentsCard />
                <RecurringCard />
              </>
            }
          />
        </>
      ) : (
        <HouseholdCreateCard />
      )}
    </Screen>
  );
}