import { StyleSheet } from 'react-native';

import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

// Static (color-independent) styles shared across the transfers/recurring
// movement components. Colors are applied inline per-element via the
// current theme, so this object has no theme dependency and can be a
// plain module-level constant shared by every component in this feature.
export const styles: any = StyleSheet.create({
  formFields: { gap: spacing(3) },
  fieldGroup: { gap: spacing(2) },
  fieldLabel: { fontWeight: typography.fontWeight.semibold as any },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  filters: { gap: spacing(2), marginBottom: spacing(4) },
  ruleTitle: { gap: spacing(1.5), alignItems: 'flex-start' },
  ruleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  ruleKind: { fontSize: typography.fontSize[12] },
  routeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  routeAccount: { fontWeight: typography.fontWeight.semibold as any },
  ruleAmount: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  menuButton: {
    width: spacing(9),
    height: spacing(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  dateButton: {
    minHeight: spacing(11),
    borderWidth: 1,
    borderRadius: radius.mdPlus,
    paddingHorizontal: spacing(3.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePicker: {
    gap: spacing(2),
    padding: spacing(3),
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(2),
  },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing(4) },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: {
    alignSelf: 'center',
    gap: spacing(3.5),
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(4.5),
    maxWidth: '100%',
  },
  historyCard: {
    alignSelf: 'center',
    gap: spacing(3.5),
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(4.5),
    maxWidth: '100%',
  },
  historyRow: { gap: spacing(1.5), borderTopWidth: 1, paddingTop: spacing(2) },
  menuCard: {
    alignSelf: 'center',
    gap: spacing(2.5),
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(4.5),
    maxWidth: '100%',
  },
  modalTitle: {
    fontSize: typography.fontSize[20],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing(2),
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
