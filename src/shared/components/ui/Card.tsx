
import { ReactNode } from "react";
import { Card as PaperCard } from "react-native-paper";
import { spacing } from "@/shared/theme";

type Props = {
  children: ReactNode;
};

export default function Card({ children }: Props) {
  return (
    <PaperCard style={{ marginBottom: spacing.lg }}>
      <PaperCard.Content>
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
}