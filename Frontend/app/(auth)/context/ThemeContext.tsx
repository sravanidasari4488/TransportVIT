import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { colors } from '../../constants/colors';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  currentTheme: 'light' | 'dark'; // The actual theme being used (resolved from 'auto')
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');

  // Calculate the current theme (resolve 'auto' to actual theme)
  const currentTheme: 'light' | 'dark' = 
    theme === 'auto' ? (systemColorScheme || 'light') : theme;

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = await AsyncStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
        setThemeState(storedTheme);
      } else {
        setThemeState('auto');
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const toggleTheme = async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const themeColors = currentTheme === 'dark' ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        currentTheme,
        toggleTheme, 
        setTheme,
        isDark: currentTheme === 'dark',
        colors: themeColors
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeProvider, useTheme };
export default ThemeProvider; // ✅ Default export added
