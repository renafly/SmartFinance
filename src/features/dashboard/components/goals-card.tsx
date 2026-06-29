import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";

export default function GoalsCard() {
  return (
    <Section title="Objetivos">
      <Card>
        <EmptyState message="Nenhum objetivo disponível." />
      </Card>
    </Section>
  );
}