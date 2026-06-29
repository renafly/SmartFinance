import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";

export default function RecentTransactionsCard() {
  return (
    <Section title="Últimas transações">
      <Card>
        <EmptyState message="Ainda não existem transações." />
      </Card>
    </Section>
  );
}