import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";

export default function RecentTransactionsCard() {
  return (
    <Section title="Últimas transações">
      <Card>
        <EmptyState message="Ainda não existem transações." />
      </Card>
    </Section>
  );
}