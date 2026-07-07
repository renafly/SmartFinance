import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { typography } from '@/theme/typography';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.link }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: typography.fontSize[14],
    lineHeight: typography.lineHeight[20],
    fontWeight: typography.fontWeight.medium,
  },
  smallBold: {
    fontSize: typography.fontSize[14],
    lineHeight: typography.lineHeight[20],
    fontWeight: typography.fontWeight.bold,
  },
  default: {
    fontSize: typography.fontSize[16],
    lineHeight: typography.lineHeight[24],
    fontWeight: typography.fontWeight.medium,
  },
  title: {
    fontSize: typography.fontSize[48],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight[52],
  },
  subtitle: {
    fontSize: typography.fontSize[32],
    lineHeight: typography.lineHeight[44],
    fontWeight: typography.fontWeight.semibold,
  },
  link: {
    lineHeight: typography.lineHeight[30],
    fontSize: typography.fontSize[14],
  },
  linkPrimary: {
    lineHeight: typography.lineHeight[30],
    fontSize: typography.fontSize[14],
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: typography.fontWeight.bold }) ?? typography.fontWeight.medium,
    fontSize: typography.fontSize[12],
  },
});
