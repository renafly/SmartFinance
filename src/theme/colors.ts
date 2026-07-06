// Light/Dark palettes. #6366F1 is the only brand-derived value
// until a real color question exists (see TemplateEngine.ps1 notes).
export const lightColors = {
  primary: '#6366F1',
  background: '#FFFFFF',
  foreground: '#0A0A0A',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  destructive: '#EF4444',
};

export const darkColors = {
  primary: '#6366F1',
  background: '#0A0A0A',
  foreground: '#FAFAFA',
  muted: '#18181B',
  border: '#27272A',
  destructive: '#F87171',
};

export type ThemeColors = typeof lightColors;
