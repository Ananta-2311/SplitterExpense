export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderSecondary: string;
  
  // Card colors
  card: string;
  cardBorder: string;
  
  // Button colors
  button: string;
  buttonText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  // Input colors
  input: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Accent colors
  primary: string;
  primaryText: string;
}

export const lightTheme: ThemeColors = {
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F3F4F6',
  
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  border: '#E5E7EB',
  borderSecondary: '#D1D5DB',
  
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  
  button: '#4F46E5',
  buttonText: '#FFFFFF',
  buttonSecondary: '#F3F4F6',
  buttonSecondaryText: '#111827',
  
  input: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputText: '#111827',
  inputPlaceholder: '#9CA3AF',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  primary: '#4F46E5',
  primaryText: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  background: '#111827',
  backgroundSecondary: '#1F2937',
  backgroundTertiary: '#374151',
  
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  
  border: '#374151',
  borderSecondary: '#4B5563',
  
  card: '#1F2937',
  cardBorder: '#374151',
  
  button: '#6366F1',
  buttonText: '#FFFFFF',
  buttonSecondary: '#374151',
  buttonSecondaryText: '#F9FAFB',
  
  input: '#1F2937',
  inputBorder: '#4B5563',
  inputText: '#F9FAFB',
  inputPlaceholder: '#6B7280',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  primary: '#6366F1',
  primaryText: '#FFFFFF',
};

export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkTheme : lightTheme;
};
