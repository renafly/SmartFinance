import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { HouseholdMemberDetails } from '@/features/households/hooks/useHouseholdMemberDetails';
import { spacing } from '@/theme/spacing';
import { SelectionOptionRow, SelectionShell, SelectionTrigger } from '@/components/selection-shell';

type HouseholdMemberSelectProps = {
  label: string;
  members: HouseholdMemberDetails[];
  value: string;
  placeholder: string;
  onChange: (userId: string) => void;
  hint?: string;
  disabled?: boolean;
  showSharedOption?: boolean;
  sharedLabel?: string;
  sharedDescription?: string;
};

function getMemberLabel(member: HouseholdMemberDetails) {
  return member.fullName?.trim() || member.email || member.userId;
}

export function HouseholdMemberSelect({
  label,
  members,
  value,
  placeholder,
  onChange,
  hint,
  disabled,
  showSharedOption,
  sharedLabel = 'Shared',
  sharedDescription,
}: HouseholdMemberSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (showSharedOption && value === '') {
      return sharedLabel;
    }

    const member = members.find((item) => item.userId === value);
    return member ? getMemberLabel(member) : placeholder;
  }, [members, placeholder, sharedLabel, showSharedOption, value]);

  return (
    <View style={styles.wrapper}>
      <SelectionTrigger
        label={label}
        valueLabel={selectedLabel}
        hint={hint}
        placeholder={placeholder}
        iconName={showSharedOption && value === '' ? 'people-outline' : 'person-outline'}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />

      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel="Close"
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(2.5) }}>
          {showSharedOption ? (
            <SelectionOptionRow
              title={sharedLabel}
              subtitle={sharedDescription ?? 'No specific owner · shared by the household'}
              active={value === ''}
              iconName="people-outline"
              onPress={() => {
                onChange('');
                setOpen(false);
              }}
            />
          ) : null}
          {members.map((member) => {
            const active = member.userId === value;
            return (
              <SelectionOptionRow
                key={member.userId}
                title={getMemberLabel(member)}
                subtitle={`${member.email ?? 'No email'} · ${member.role} · ${member.status}`}
                active={active}
                iconName="person-outline"
                onPress={() => {
                  onChange(member.userId);
                  setOpen(false);
                }}
              />
            );
          })}
        </View>
      </SelectionShell>
    </View>
  );
}

const styles: any = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
  },
} as any);
