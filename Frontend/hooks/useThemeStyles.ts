import { useTheme } from '../app/(auth)/context/ThemeContext';

export const useThemeStyles = () => {
  const { currentTheme, isDark, colors } = useTheme();

  // NativeWind class utilities
  const tw = {
    bg: {
      primary: isDark ? 'bg-dark-background' : 'bg-light-background',
      surface: isDark ? 'bg-dark-surface' : 'bg-light-surface',
      card: isDark ? 'bg-dark-card' : 'bg-light-card',
    },
    text: {
      primary: isDark ? 'text-dark-text' : 'text-light-text',
      secondary: isDark ? 'text-dark-textSecondary' : 'text-light-textSecondary',
      accent: isDark ? 'text-dark-primary' : 'text-light-primary',
    },
    border: {
      default: isDark ? 'border-dark-border' : 'border-light-border',
    }
  };

  // Style objects for inline styles
  const styles = {
    background: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface },
    card: { backgroundColor: colors.surface },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    primary: { color: colors.primary },
    border: { borderColor: colors.border },
    shadow: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    }
  };

  return {
    currentTheme,
    isDark,
    colors,
    tw,
    styles,
  };
};