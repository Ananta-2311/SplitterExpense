import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Theme, ThemeColors } from '@expensetracker/shared';
import { getThemeColors } from '@expensetracker/shared';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  colors: getThemeColors(false),
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = 'theme-preference';

const getStoredTheme = async (): Promise<Theme> => {
  try {
    const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return (stored as Theme) || 'system';
  } catch (error) {
    console.error('Error getting stored theme:', error);
    return 'system';
  }
};

const setStoredTheme = async (theme: Theme) => {
  try {
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Error storing theme:', error);
  }
};

const getIsDark = (theme: Theme, systemColorScheme: ColorSchemeName): boolean => {
  if (theme === 'system') {
    return systemColorScheme === 'dark';
  }
  return theme === 'dark';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [isDark, setIsDark] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(getThemeColors(false));

  useEffect(() => {
    // Load theme from SecureStore
    const loadTheme = async () => {
      const storedTheme = await getStoredTheme();
      setThemeState(storedTheme);
      const dark = getIsDark(storedTheme, systemColorScheme);
      setIsDark(dark);
      setColors(getThemeColors(dark));
    };

    loadTheme();

    // Listen for system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
      if (theme === 'system') {
        const dark = colorScheme === 'dark';
        setIsDark(dark);
        setColors(getThemeColors(dark));
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Update when theme changes
    const dark = getIsDark(theme, systemColorScheme);
    setIsDark(dark);
    setColors(getThemeColors(dark));
  }, [theme, systemColorScheme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await setStoredTheme(newTheme);
    const dark = getIsDark(newTheme, systemColorScheme);
    setIsDark(dark);
    setColors(getThemeColors(dark));
  };

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
