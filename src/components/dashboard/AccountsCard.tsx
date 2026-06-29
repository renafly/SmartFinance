import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";

export default function AccountsCard() {
  return (
    <Section title="Contas">
      <Card>
        <EmptyState message="Sem contas criadas." />
      </Card>
    </Section>
  );
}