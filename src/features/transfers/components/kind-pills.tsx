import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Pill } from '@/components/migrated-page';

import { styles } from '../ui-styles';
import type { MovementKind } from '../types';

type KindPillsProps = {
  value: MovementKind;
  onChange: (kind: MovementKind) => void;
};

export function KindPills({ value, onChange }: KindPillsProps) {
  const { t } = useTranslation('common');

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{t('transfers.movementType')}</Text>
      <View style={styles.pillRow}>
        {(['recurring-transfer', 'recurring-transaction'] as MovementKind[]).map((kind) => (
          <Pill
            key={kind}
            label={t(
              `transfers.types.${kind === 'one-off' ? 'oneOff' : kind === 'recurring-transfer' ? 'recurringTransfer' : 'recurringTransaction'}`,
            )}
            active={value === kind}
            onPress={() => onChange(kind)}
          />
        ))}
      </View>
    </View>
  );
}
