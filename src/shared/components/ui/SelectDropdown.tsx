import { useState, useRef } from "react";
import { View } from "react-native";
import { Button, Menu, Text } from "react-native-paper";

export type SelectOption = { id: string; label: string };

type Props = {
  options: SelectOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  nullable?: boolean;
  nullLabel?: string;
  label?: string;
  disabled?: boolean;
};

export function SelectDropdown({
  options,
  selected,
  onSelect,
  nullable = false,
  nullLabel = "None",
  label,
  disabled = false,
}: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  const selectedLabel =
    !selected || selected === ""
      ? nullLabel
      : options.find((o) => o.id === selected)?.label ?? label ?? "Select";

  const allOptions = nullable
    ? [{ id: "", label: nullLabel }, ...options]
    : options;

  return (
    <View>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            disabled={disabled}
          >
            {selectedLabel}
          </Button>
        }
      >
        {allOptions.map((option) => (
          <Menu.Item
            key={option.id}
            onPress={() => {
              onSelect(option.id);
              setMenuVisible(false);
            }}
            title={option.label}
          />
        ))}
      </Menu>
    </View>
  );
}
