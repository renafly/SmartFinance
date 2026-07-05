import { useState } from "react";
import { TextInput as NativeTextInput, View } from "react-native";
import { Text } from "react-native-paper";

import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { useCreateHousehold } from "@/features/households/hooks";
import { useSession } from "@/shared/session";
import { colors, spacing } from "@/shared/theme";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function HouseholdCreateCard({
  title = "Create Household",
  subtitle = "Set up a household before adding accounts or transactions.",
}: Props) {
  const { data: session } = useSession();
  const createHousehold = useCreateHousehold();
  const [name, setName] = useState("");

  const onCreate = () => {
    createHousehold.mutate(name, {
      onSuccess: () => {
        setName("");
      },
    });
  };

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text }}>{title}</Text>
          <Text style={{ color: colors.textMuted }}>{subtitle}</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontWeight: "700" }}>Household name</Text>
          <NativeTextInput
            value={name}
            onChangeText={setName}
            placeholder={session?.profile.full_name ? `${session.profile.full_name}'s Household` : "My Household"}
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              minHeight: 56,
              color: colors.text,
            }}
          />
        </View>

        {createHousehold.error ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>{String(createHousehold.error.message)}</Text>
        ) : null}

        <Button
          title="Create Household"
          onPress={onCreate}
          loading={createHousehold.isPending}
          disabled={createHousehold.isPending || !name.trim()}
        />
      </View>
    </Card>
  );
}
