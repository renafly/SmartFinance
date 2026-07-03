import { Platform, ScrollView, View, Pressable } from "react-native";
import { Button, Text } from "react-native-paper";
import { colors, spacing } from "@/shared/theme";

export type SelectOption = { id: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  nullable?: boolean;
  nullLabel?: string;
};

export function SelectSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  nullable = false,
  nullLabel = "None",
}: Props) {
  if (!visible) {
    return null;
  }

  const isWeb = Platform.OS === "web";

  return (
    <View
      style={{
        position: "absolute",
        top: isWeb ? "100%" : 0,
        right: 0,
        left: isWeb ? 0 : 0,
        bottom: isWeb ? undefined : 0,
        backgroundColor: isWeb ? "transparent" : "rgba(17, 17, 17, 0.32)",
        justifyContent: isWeb ? "flex-start" : "center",
        paddingHorizontal: isWeb ? 0 : spacing.lg,
        paddingTop: isWeb ? spacing.xs : 0,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: isWeb ? -9999 : 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
      <View
        style={{
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 3,
          borderColor: colors.text,
          maxHeight: isWeb ? 320 : "80%",
          width: "100%",
          shadowColor: isWeb ? undefined : undefined,
        }}
      >
        {!isWeb && (
          <Text variant="headlineSmall" style={{ marginBottom: spacing.lg }}>
            {title}
          </Text>
        )}

        <ScrollView style={{ maxHeight: 400 }} scrollEnabled={options.length > 8}>
          {nullable && (
            <Pressable
              onPress={() => {
                onSelect("");
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                marginVertical: spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderWidth: 2,
                borderColor: selected === null || selected === "" ? colors.text : colors.border,
                backgroundColor: selected === null || selected === "" ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ fontWeight: "900", width: 20 }}>{selected === null || selected === "" ? "●" : "○"}</Text>
              <Text style={{ flex: 1 }}>{nullLabel}</Text>
            </Pressable>
          )}
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                onSelect(option.id);
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                marginVertical: spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderWidth: 2,
                borderColor: option.id === selected ? colors.text : colors.border,
                backgroundColor: option.id === selected ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ fontWeight: "900", width: 20 }}>{option.id === selected ? "●" : "○"}</Text>
              <Text style={{ flex: 1 }}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {!isWeb && (
          <Button
            mode="outlined"
            onPress={onClose}
            style={{ marginTop: spacing.lg }}
          >
            Close
          </Button>
        )}
      </View>
    </View>
  );
}
