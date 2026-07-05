import { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { colors, spacing } from "@/shared/theme";

export type SelectOption = { id: string; label: string };

type Props = {
  label?: string;
  options: SelectOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  nullable?: boolean;
  nullLabel?: string;
  error?: string;
  disabled?: boolean;
};

type Anchor = { x: number; y: number; width: number; height: number };

const DROPDOWN_MAX_HEIGHT = 280;

export function Select({
  label,
  options,
  selected,
  onSelect,
  placeholder = "Select",
  nullable = false,
  nullLabel = "None",
  error,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0, width: 0, height: 0 });
  const triggerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();

  const isWeb = Platform.OS === "web";

  const allOptions: SelectOption[] = nullable
    ? [{ id: "", label: nullLabel }, ...options]
    : options;

  const isSelected = (id: string) =>
    id === "" ? selected === null || selected === "" : id === selected;

  const selectedLabel =
    selected === null || selected === ""
      ? nullable
        ? nullLabel
        : placeholder
      : options.find((o) => o.id === selected)?.label ?? placeholder;

  const openMenu = () => {
    if (disabled) return;
    const node = triggerRef.current;
    if (node && typeof node.measureInWindow === "function") {
      node.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  // Web: anchored dropdown below (or above) the trigger.
  const spaceBelow = windowHeight - (anchor.y + anchor.height);
  const openUpward = isWeb && spaceBelow < DROPDOWN_MAX_HEIGHT && anchor.y > spaceBelow;

  const renderOptions = () => (
    <ScrollView
      style={{ maxHeight: DROPDOWN_MAX_HEIGHT - 8 }}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      {allOptions.map((option) => {
        const active = isSelected(option.id);
        return (
          <Pressable
            key={option.id || "__null__"}
            onPress={() => handleSelect(option.id)}
            style={({ hovered }: any) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              backgroundColor: active
                ? colors.primary
                : hovered
                  ? "#F2EFE6"
                  : colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: "#EAE6DA",
            })}
          >
            <Text style={{ fontWeight: "700", width: 16 }}>
              {active ? "●" : "○"}
            </Text>
            <Text style={{ flex: 1, fontWeight: active ? "700" : "400" }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={{ gap: spacing.sm, flex: 1 }}>
      {label ? <Text style={{ fontWeight: "700" }}>{label}</Text> : null}

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          disabled={disabled}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: disabled ? "#F2F2F2" : colors.surface,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            minHeight: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.sm,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color:
                selected === null || selected === ""
                  ? nullable
                    ? colors.text
                    : colors.textMuted
                  : colors.text,
            }}
          >
            {selectedLabel}
          </Text>
          <Text style={{ fontWeight: "700" }}>{open ? "▲" : "▼"}</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType={isWeb ? "none" : "fade"}
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: isWeb ? "transparent" : "rgba(17, 17, 17, 0.4)",
            justifyContent: isWeb ? "flex-start" : "flex-end",
          }}
        >
          {isWeb ? (
            // Anchored dropdown panel positioned under the trigger.
            <View
              // Stop backdrop press from closing when interacting with the panel.
              onStartShouldSetResponder={() => true}
              style={{
                position: "absolute",
                left: anchor.x,
                width: anchor.width,
                top: openUpward ? undefined : anchor.y + anchor.height + 4,
                bottom: openUpward
                  ? windowHeight - anchor.y + 4
                  : undefined,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                maxHeight: DROPDOWN_MAX_HEIGHT,
                overflow: "hidden",
              }}
            >
              {renderOptions()}
            </View>
          ) : (
            // Mobile bottom sheet.
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderTopWidth: 3,
                borderColor: colors.border,
                paddingBottom: spacing.xl,
                paddingTop: spacing.md,
                maxHeight: "70%",
              }}
            >
              {label ? (
                <Text
                  variant="headlineSmall"
                  style={{
                    paddingHorizontal: spacing.lg,
                    marginBottom: spacing.md,
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
              ) : null}
              <View style={{ paddingHorizontal: spacing.md }}>{renderOptions()}</View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
