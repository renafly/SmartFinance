import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";

export default function UpcomingPaymentsCard() {
  return (
    <Section title="Próximos pagamentos">
      <Card>
        <EmptyState message="Sem pagamentos agendados." />
      </Card>
    </Section>
  );
}