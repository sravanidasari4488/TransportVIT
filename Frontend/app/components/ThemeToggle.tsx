import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ThemeToggle = () => {
  const { theme, setTheme, currentTheme, colors } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'sunny' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'auto', label: 'Auto', icon: 'phone-portrait' },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
      <View style={styles.toggleContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              theme === option.value && {
                backgroundColor: colors.primary,
              },
              { borderColor: colors.border }
            ]}
            onPress={() => setTheme(option.value)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={theme === option.value ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.optionText,
                {
                  color: theme === option.value ? '#FFFFFF' : colors.text,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Currently using: {currentTheme === 'dark' ? 'Dark' : 'Light'} mode
      </Text>
    </View>
  );
};

export const SimpleThemeToggle = () => {
  const { toggleTheme, isDark, colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.simpleToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={toggleTheme}
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={24}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    borderWidth: 1,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  simpleToggle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});