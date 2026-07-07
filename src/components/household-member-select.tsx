import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { HouseholdMemberDetails } from '@/features/households/hooks/useHouseholdMemberDetails';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

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
  const { colors } = useTheme();

  const selectedLabel = useMemo(() => {
    if (showSharedOption && value === '') {
      return sharedLabel;
    }

    const member = members.find((item) => item.userId === value);
    return member ? getMemberLabel(member) : placeholder;
  }, [members, placeholder, sharedLabel, showSharedOption, value]);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selector,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Ionicons name={showSharedOption && value === '' ? 'people-outline' : 'person-outline'} size={16} color={colors.textSecondary} />
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text style={[styles.value, { color: colors.text }]}>{selectedLabel}</Text>
          {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
        </View>
        <Text style={[styles.chevron, { color: colors.link }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{hint ?? placeholder}</Text>
            <View style={{ gap: spacing(2.5) }}>
              {showSharedOption ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.memberRow,
                    { backgroundColor: value === '' ? colors.primary : colors.surfaceMuted, borderColor: value === '' ? colors.primary : colors.border },
                    value === '' && styles.memberRowActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={value === '' ? colors.primaryForeground : colors.textSecondary}
                  />
                  <View style={{ flex: 1, gap: spacing(1) }}>
                    <Text style={[styles.memberName, { color: value === '' ? colors.primaryForeground : colors.text }]}>{sharedLabel}</Text>
                    <Text style={[styles.memberMeta, { color: value === '' ? colors.primaryForeground : colors.textSecondary }]}>
                      {sharedDescription ?? 'No specific owner · shared by the household'}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, { borderColor: value === '' ? colors.primaryForeground : colors.borderStrong, backgroundColor: value === '' ? colors.primaryForeground : colors.surfaceMuted }, value === '' && styles.checkboxActive]}>
                    <Text style={[styles.checkboxLabel, { color: value === '' ? colors.primary : colors.textSecondary }]}>{value === '' ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              ) : null}
              {members.map((member) => {
                const active = member.userId === value;
                return (
                  <Pressable
                    key={member.userId}
                    onPress={() => {
                      onChange(member.userId);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.memberRow,
                      { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border },
                      active && styles.memberRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={active ? colors.primaryForeground : colors.textSecondary}
                    />
                    <View style={{ flex: 1, gap: spacing(1) }}>
                      <Text style={[styles.memberName, { color: active ? colors.primaryForeground : colors.text }]}>{getMemberLabel(member)}</Text>
                      <Text style={[styles.memberMeta, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
                        {member.email ?? 'No email'} · {member.role} · {member.status}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: active ? colors.primaryForeground : colors.borderStrong, backgroundColor: active ? colors.primaryForeground : colors.surfaceMuted }, active && styles.checkboxActive]}>
                      <Text style={[styles.checkboxLabel, { color: active ? colors.primary : colors.textSecondary }]}>{active ? '✓' : ''}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }, pressed && styles.pressed]}
            >
              <Ionicons name="close-outline" size={16} color={colors.text} />
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles: any = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
  },
  label: {
    fontWeight: String(typography.fontWeight.semibold),
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  value: {
    fontSize: typography.fontSize[14],
    fontWeight: String(typography.fontWeight.bold),
  },
  hint: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  chevron: {
    fontSize: typography.fontSize[18],
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing(5),
  },
  modalCard: {
    gap: spacing(3.5),
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing(4.5),
  },
  modalTitle: {
    fontSize: typography.fontSize[20],
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  memberRowActive: {
  },
  memberName: {
    fontSize: typography.fontSize[14],
    fontWeight: String(typography.fontWeight.bold),
  },
  memberMeta: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  checkbox: {
    width: spacing(5.5),
    height: spacing(5.5),
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
  },
  checkboxLabel: {
    fontSize: typography.fontSize[12],
    fontWeight: String(typography.fontWeight.extraBold),
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.md,
    borderWidth: 1,
  },
  closeButtonText: {
    fontWeight: String(typography.fontWeight.bold),
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
} as any);
