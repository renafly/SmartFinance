import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

import { useOnboarding } from './OnboardingProvider';
import type { OnboardingLocale } from './types';

type GuideModalProps = {
  locale?: OnboardingLocale;
};

export function GuideModal({ locale }: GuideModalProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('common');
  const { visible, currentGuide, currentStep, currentStepIndex, previous, next, dismiss } = useOnboarding();

  if (!currentGuide || !currentStep) return null;

  const resolvedLocale = locale ?? (i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'en');
  const copy = currentStep.copy[resolvedLocale];
  const text = {
    back: t('onboarding.back'),
    next: t('onboarding.next'),
    skip: t('onboarding.skip'),
    done: t('onboarding.done'),
    guide: t('onboarding.sectionGuide'),
  };
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentGuide.steps.length - 1;
  const progress = t('onboarding.progress', { current: currentStepIndex + 1, total: currentGuide.steps.length });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View
          accessibilityRole="alert"
          accessibilityLabel={`${text.guide}: ${copy.title}`}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.topRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.stepBadgeText, { color: colors.primary }]}>{progress}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.skip}
              onPress={dismiss}
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>{text.skip}</Text>
            </Pressable>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.progressValue,
                { backgroundColor: colors.primary, width: `${((currentStepIndex + 1) / currentGuide.steps.length) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{copy.body}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.back}
              accessibilityState={{ disabled: isFirstStep }}
              disabled={isFirstStep}
              onPress={previous}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && !isFirstStep && styles.pressed, isFirstStep && styles.disabled]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{text.back}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLastStep ? text.done : text.next}
              onPress={next}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{isLastStep ? text.done : text.next}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(5) },
  sheet: { width: '100%', maxWidth: 480, borderWidth: 1, borderRadius: radius.xxl, padding: spacing(6), gap: spacing(5) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBadge: { borderRadius: radius.full, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  stepBadgeText: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
  skipButton: { padding: spacing(1) },
  skipText: { fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.semibold },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: radius.full },
  progressValue: { height: '100%', borderRadius: radius.full },
  copy: { gap: spacing(2) },
  title: { fontSize: typography.fontSize[24], lineHeight: typography.lineHeight[30], fontWeight: typography.fontWeight.extraBold },
  body: { fontSize: typography.fontSize[15], lineHeight: typography.lineHeight[24] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(3) },
  secondaryButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing(4) },
  secondaryButtonText: { fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.bold },
  primaryButton: { minHeight: 44, justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing(4) },
  primaryButtonText: { fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.bold },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.45 },
});
