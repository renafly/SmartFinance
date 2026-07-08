import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type ResponsiveSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ResponsiveMetrics = {
  width: number;
  size: ResponsiveSize;
  isCompact: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  pagePadding: number;
  pageGap: number;
  cardPadding: number;
  cardGap: number;
  headerPadding: number;
  headerGap: number;
  modalPadding: number;
  fieldPaddingHorizontal: number;
  fieldPaddingVertical: number;
  buttonPaddingHorizontal: number;
  buttonPaddingVertical: number;
  titleFontSize: number;
  titleLineHeight: number;
  sectionTitleFontSize: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  tableCellGap: number;
};

export function getResponsiveMetrics(width: number): ResponsiveMetrics {
  if (width < 360) {
    return {
      width,
      size: 'xs',
      isCompact: true,
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      pagePadding: 10,
      pageGap: 12,
      cardPadding: 12,
      cardGap: 10,
      headerPadding: 14,
      headerGap: 10,
      modalPadding: 12,
      fieldPaddingHorizontal: 12,
      fieldPaddingVertical: 10,
      buttonPaddingHorizontal: 12,
      buttonPaddingVertical: 9,
      titleFontSize: 24,
      titleLineHeight: 30,
      sectionTitleFontSize: 16,
      bodyFontSize: 13,
      bodyLineHeight: 18,
      tableCellGap: 8,
    };
  }

  if (width < 520) {
    return {
      width,
      size: 'sm',
      isCompact: true,
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      pagePadding: 14,
      pageGap: 14,
      cardPadding: 14,
      cardGap: 12,
      headerPadding: 16,
      headerGap: 12,
      modalPadding: 16,
      fieldPaddingHorizontal: 14,
      fieldPaddingVertical: 11,
      buttonPaddingHorizontal: 14,
      buttonPaddingVertical: 10,
      titleFontSize: 28,
      titleLineHeight: 34,
      sectionTitleFontSize: 17,
      bodyFontSize: 13,
      bodyLineHeight: 19,
      tableCellGap: 10,
    };
  }

  if (width < 900) {
    return {
      width,
      size: 'md',
      isCompact: false,
      isPhone: false,
      isTablet: true,
      isDesktop: false,
      pagePadding: 18,
      pageGap: 18,
      cardPadding: 16,
      cardGap: 14,
      headerPadding: 18,
      headerGap: 14,
      modalPadding: 20,
      fieldPaddingHorizontal: 14,
      fieldPaddingVertical: 12,
      buttonPaddingHorizontal: 14,
      buttonPaddingVertical: 11,
      titleFontSize: 30,
      titleLineHeight: 36,
      sectionTitleFontSize: 18,
      bodyFontSize: 14,
      bodyLineHeight: 20,
      tableCellGap: 12,
    };
  }

  if (width < 1280) {
    return {
      width,
      size: 'lg',
      isCompact: false,
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      pagePadding: 20,
      pageGap: 20,
      cardPadding: 16,
      cardGap: 14,
      headerPadding: 20,
      headerGap: 14,
      modalPadding: 20,
      fieldPaddingHorizontal: 14,
      fieldPaddingVertical: 12,
      buttonPaddingHorizontal: 14,
      buttonPaddingVertical: 10,
      titleFontSize: 34,
      titleLineHeight: 38,
      sectionTitleFontSize: 18,
      bodyFontSize: 14,
      bodyLineHeight: 20,
      tableCellGap: 10,
    };
  }

  return {
    width,
    size: 'xl',
    isCompact: false,
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    pagePadding: 24,
    pageGap: 22,
    cardPadding: 18,
    cardGap: 16,
    headerPadding: 22,
    headerGap: 16,
    modalPadding: 22,
    fieldPaddingHorizontal: 16,
    fieldPaddingVertical: 13,
    buttonPaddingHorizontal: 16,
    buttonPaddingVertical: 11,
    titleFontSize: 36,
    titleLineHeight: 42,
    sectionTitleFontSize: 19,
    bodyFontSize: 14,
    bodyLineHeight: 20,
    tableCellGap: 10,
  };
}

export function useResponsiveMetrics(): ResponsiveMetrics {
  const { width } = useWindowDimensions();
  return useMemo(() => getResponsiveMetrics(width), [width]);
}
