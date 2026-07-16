import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const LOOP_DURATION = 900;

type FigureColors = {
  primary: string;
  foreground: string;
  soft: string;
};

function RobotFigure({ primary, foreground, soft }: FigureColors) {
  return (
    <View style={styles.robot}>
      <View style={[styles.antennaStem, { backgroundColor: primary }]} />
      <View style={[styles.antennaDot, { backgroundColor: primary }]} />
      <View style={[styles.robotHead, { backgroundColor: primary, borderColor: foreground }]}>
        <View style={[styles.robotEye, { backgroundColor: foreground }]} />
        <View style={[styles.robotEye, { backgroundColor: foreground }]} />
      </View>
      <View style={[styles.robotNeck, { backgroundColor: primary }]} />
      <View style={[styles.robotBody, { backgroundColor: primary, borderColor: foreground }]}>
        <View style={[styles.robotPanel, { backgroundColor: soft }]} />
      </View>
      <View style={[styles.robotArm, styles.robotArmLeft, { backgroundColor: primary }]} />
      <View style={[styles.robotArm, styles.robotArmRight, { backgroundColor: primary }]} />
    </View>
  );
}

function PersonFigure({ primary, soft }: FigureColors) {
  return (
    <View style={styles.person}>
      <View style={[styles.personHead, { backgroundColor: primary }]} />
      <View style={[styles.personBody, { backgroundColor: primary }]} />
      <View style={[styles.personHeart, { backgroundColor: soft }]} />
    </View>
  );
}

function FamilyMember({ color, scale = 1, offset = 0 }: { color: string; scale?: number; offset?: number }) {
  return (
    <View style={[styles.familyMember, { transform: [{ translateY: offset }, { scale }] }]}>
      <View style={[styles.familyHead, { backgroundColor: color }]} />
      <View style={[styles.familyBody, { backgroundColor: color }]} />
    </View>
  );
}

function FamilyFigure({ primary, soft }: FigureColors) {
  return (
    <View style={styles.family}>
      <FamilyMember color={soft} scale={0.82} offset={9} />
      <FamilyMember color={primary} />
      <FamilyMember color={soft} scale={0.82} offset={9} />
    </View>
  );
}

export function AuthLoadingTransition() {
  const { t } = useTranslation('common');
  const { colors, shadows } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 2.2 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 2.2;
      return;
    }

    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: LOOP_DURATION, easing: Easing.inOut(Easing.cubic) }),
        withTiming(2, { duration: LOOP_DURATION, easing: Easing.inOut(Easing.cubic) }),
        withTiming(2.65, { duration: LOOP_DURATION, easing: Easing.out(Easing.cubic) }),
        withTiming(3, { duration: 260, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const robotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.72, 1.05], [1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 0.72, 1.05], [0.82, 1, 1.12], Extrapolation.CLAMP) },
      { rotate: `${interpolate(progress.value, [0, 1.05], [-5, 5], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const personStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.72, 1.05, 1.65, 2.05], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0.72, 1.1, 1.65, 2.05], [0.68, 1, 1, 1.16], Extrapolation.CLAMP) },
    ],
  }));

  const familyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.7, 2.05, 2.72, 3], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [1.7, 2.12, 2.65], [0.7, 1.04, 1], Extrapolation.CLAMP) },
    ],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 2.7, 3], [0.35, 0.8, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ rotate: `${interpolate(progress.value, [0, 3], [0, 280])}deg` }],
  }));

  const figureColors = {
    primary: colors.primary,
    foreground: colors.primaryForeground,
    soft: colors.primarySoft,
  };

  return (
    <View
      accessible
      accessibilityLabel={t('auth.loadingAccessibilityLabel')}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="auth-loading-transition">
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop, { backgroundColor: colors.primarySoft }]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom, { backgroundColor: colors.surfaceMuted }]} />

      <View style={styles.content}>
        <View style={[styles.stageCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.lg]}>
          <View style={[styles.stageHalo, { backgroundColor: colors.primarySoft }]} />
          <Animated.View style={[styles.orbit, { borderColor: colors.primary }, orbitStyle]}>
            <View style={[styles.orbitDot, { backgroundColor: colors.primary }]} />
          </Animated.View>

          <View style={styles.figureStage}>
            <Animated.View style={[styles.figureLayer, robotStyle]}>
              <RobotFigure {...figureColors} />
            </Animated.View>
            <Animated.View style={[styles.figureLayer, personStyle]}>
              <PersonFigure {...figureColors} />
            </Animated.View>
            <Animated.View style={[styles.figureLayer, familyStyle]}>
              <FamilyFigure {...figureColors} />
            </Animated.View>
          </View>
        </View>

        <Text accessibilityLiveRegion="polite" style={[styles.title, { color: colors.text }]}>
          {t('auth.preparingDashboard')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.preparingDashboardDescription')}</Text>

        <View style={styles.steps} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: spacing(120),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing(6),
  },
  backgroundOrb: {
    position: 'absolute',
    width: spacing(70),
    height: spacing(70),
    borderRadius: radius.full,
    opacity: 0.52,
  },
  backgroundOrbTop: {
    top: spacing(-32),
    right: spacing(-24),
  },
  backgroundOrbBottom: {
    bottom: spacing(-38),
    left: spacing(-26),
  },
  content: {
    width: '100%',
    maxWidth: spacing(105),
    alignItems: 'center',
  },
  stageCard: {
    width: spacing(48),
    height: spacing(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing(15),
    borderWidth: 1,
    overflow: 'hidden',
  },
  stageHalo: {
    position: 'absolute',
    width: spacing(35),
    height: spacing(35),
    borderRadius: radius.full,
    opacity: 0.62,
  },
  figureStage: {
    width: spacing(32),
    height: spacing(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  figureLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    width: spacing(41),
    height: spacing(41),
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  orbitDot: {
    position: 'absolute',
    top: spacing(-1),
    left: spacing(19),
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  robot: {
    width: spacing(23),
    height: spacing(25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  antennaStem: {
    position: 'absolute',
    top: spacing(0.5),
    width: spacing(0.75),
    height: spacing(3),
    borderRadius: radius.full,
  },
  antennaDot: {
    position: 'absolute',
    top: 0,
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  robotHead: {
    position: 'absolute',
    top: spacing(3.25),
    width: spacing(15),
    height: spacing(10),
    borderRadius: radius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  robotEye: {
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  robotNeck: {
    position: 'absolute',
    top: spacing(12.5),
    width: spacing(3),
    height: spacing(2),
  },
  robotBody: {
    position: 'absolute',
    top: spacing(14),
    width: spacing(17),
    height: spacing(9.5),
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotPanel: {
    width: spacing(5),
    height: spacing(1.5),
    borderRadius: radius.full,
  },
  robotArm: {
    position: 'absolute',
    top: spacing(15.5),
    width: spacing(2),
    height: spacing(7),
    borderRadius: radius.full,
  },
  robotArmLeft: {
    left: 0,
    transform: [{ rotate: '8deg' }],
  },
  robotArmRight: {
    right: 0,
    transform: [{ rotate: '-8deg' }],
  },
  person: {
    width: spacing(23),
    height: spacing(25),
    alignItems: 'center',
  },
  personHead: {
    width: spacing(7),
    height: spacing(7),
    borderRadius: radius.full,
  },
  personBody: {
    position: 'absolute',
    top: spacing(8),
    width: spacing(18),
    height: spacing(15),
    borderTopLeftRadius: spacing(9),
    borderTopRightRadius: spacing(9),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  personHeart: {
    position: 'absolute',
    top: spacing(12),
    width: spacing(3.5),
    height: spacing(3.5),
    borderRadius: radius.full,
  },
  family: {
    width: spacing(29),
    height: spacing(25),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  familyMember: {
    width: spacing(10),
    height: spacing(24),
    alignItems: 'center',
    marginHorizontal: spacing(-0.75),
  },
  familyHead: {
    width: spacing(5.5),
    height: spacing(5.5),
    borderRadius: radius.full,
  },
  familyBody: {
    marginTop: spacing(1),
    width: spacing(10),
    height: spacing(13),
    borderTopLeftRadius: spacing(5),
    borderTopRightRadius: spacing(5),
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  title: {
    marginTop: spacing(7),
    textAlign: 'center',
    fontSize: typography.fontSize[24],
    lineHeight: typography.lineHeight[32],
    fontWeight: typography.fontWeight.extraBold,
  },
  subtitle: {
    maxWidth: spacing(82),
    marginTop: spacing(2),
    textAlign: 'center',
    fontSize: typography.fontSize[15],
    lineHeight: typography.lineHeight[22],
    fontWeight: typography.fontWeight.medium,
  },
  steps: {
    marginTop: spacing(6),
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  stepLine: {
    width: spacing(8),
    height: 1,
    marginHorizontal: spacing(1),
  },
});
