import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";

export default function UpcomingPaymentsCard() {
  return (
    <Section title="Próximos pagamentos">
      <Card>
        <EmptyState message="Sem pagamentos agendados." />
      </Card>
    </Section>
  );
}