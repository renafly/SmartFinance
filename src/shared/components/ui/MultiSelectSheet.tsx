import { Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, spacing, radius } from "@/shared/theme";

type Option = { id: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onClear: () => void;
};

export function MultiSelectSheet({
  visible,
  title,
  options,
  selected,
  onToggle,
  onClose,
  onClear,
}: Props) {
  const isWeb = Platform.OS === "web";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(17, 17, 17, 0.4)",
          justifyContent: isWeb ? "center" : "flex-end",
          alignItems: "center",
          padding: isWeb ? spacing.lg : 0,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: isWeb ? 480 : undefined,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.md,
            }}
          >
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
              {title}
            </Text>
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={{ fontWeight: "700", color: colors.primary }}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingHorizontal: spacing.md }}
            showsVerticalScrollIndicator
          >
            {options.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onToggle(option.id)}
                  style={({ hovered }: any) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    marginVertical: spacing.xs,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.text : "#EAE6DA",
                    backgroundColor: isSelected
                      ? colors.primary
                      : hovered
                        ? "#F2EFE6"
                        : colors.surface,
                  })}
                >
                  <Text style={{ fontWeight: "700", width: 20 }}>
                    {isSelected ? "☑" : "☐"}
                  </Text>
                  <Text style={{ flex: 1, fontWeight: isSelected ? "700" : "400" }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            {options.length === 0 && (
              <Text style={{ color: colors.textMuted, padding: spacing.md }}>
                No options available.
              </Text>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "600", color: colors.onPrimary }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
