import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";

import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardGrid from "@/components/dashboard/DashboardGrid";

import AccountsCard from "@/components/dashboard/AccountsCard";
import GoalsCard from "@/components/dashboard/GoalsCard";
import RecentTransactionsCard from "@/components/dashboard/RecentTransactionsCard";
import UpcomingPaymentsCard from "@/components/dashboard/UpcomingPaymentsCard";

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