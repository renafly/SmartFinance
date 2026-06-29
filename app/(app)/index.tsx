import Screen from "@/shared/components/ui/Screen";
import PageHeader from "@/shared/components/ui/PageHeader";

import DashboardStats from "@/features/dashboard/components/dashboard-stats";
import DashboardGrid from "@/features/dashboard/components/dashboard-grid";

import AccountsCard from "@/features/dashboard/components/accounts-card";
import GoalsCard from "@/features/dashboard/components/goals-card";
import RecentTransactionsCard from "@/features/dashboard/components/recent-transactions-card";
import UpcomingPaymentsCard from "@/features/dashboard/components/upcoming-payments-card";

export default function DashboardPage() {
  return (
    <Screen>
      <PageHeader
        title="Dashboard"
        subtitle="Bem-vindo ao SmartFinance"
      />

      <DashboardStats />

      <DashboardGrid
        left={
          <>
            <RecentTransactionsCard />
            <AccountsCard />
          </>
        }
        right={
          <>
            <GoalsCard />
            <UpcomingPaymentsCard />
          </>
        }
      />
    </Screen>
  );
}