import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  SelectionOptionRow,
  SelectionShell,
  SelectionTrigger,
} from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";

export type DropdownFieldProps = {
  label: string;
  valueLabel: string;
  placeholder: string;
  hint?: string;
  selectedKey?: string;
  options: {
    key: string;
    label: string;
    subtitle?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
  }[];
  onChange: (key: string) => void;
};

export function DropdownField({
  label,
  valueLabel,
  placeholder,
  hint,
  selectedKey,
  options,
  onChange,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing(2) }}>
      <SelectionTrigger
        label={label}
        valueLabel={valueLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="chevron-down-outline"
        onPress={() => setOpen(true)}
      />
      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={placeholder}
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(2) }}>
          {options.map((option) => (
            <SelectionOptionRow
              key={option.key}
              title={option.label}
              subtitle={option.subtitle}
              iconName={option.iconName ?? "ellipse-outline"}
              active={
                selectedKey
                  ? option.key === selectedKey
                  : option.label === valueLabel
              }
              onPress={() => {
                onChange(option.key);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </SelectionShell>
    </View>
  );
}
