import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";

export default function AccountsCard() {
  return (
    <Section title="Contas">
      <Card>
        <EmptyState message="Sem contas criadas." />
      </Card>
    </Section>
  );
}