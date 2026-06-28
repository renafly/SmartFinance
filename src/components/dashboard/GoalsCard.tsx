import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";

export default function GoalsCard() {
  return (
    <Section title="Objetivos">
      <Card>
        <EmptyState message="Nenhum objetivo disponível." />
      </Card>
    </Section>
  );
}