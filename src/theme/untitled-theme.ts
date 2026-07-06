// Untitled UI-style design tokens. Colors default to #6366F1
// until a real brand palette is defined (see TemplateEngine.ps1 notes on
// the still-unanswered PrimaryColor question).
export const untitledTheme = {
  colors: {
    primary: '#6366F1',
    background: '#FFFFFF',
    foreground: '#0A0A0A',
    muted: '#F4F4F5',
    border: '#E4E4E7',
    destructive: '#EF4444',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 9999,
  },
  spacing: (multiplier: number) => multiplier * 4,
};

export type UntitledTheme = typeof untitledTheme;
