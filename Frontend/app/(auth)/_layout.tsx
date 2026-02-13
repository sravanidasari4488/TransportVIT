import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthProvider';


import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import { useTheme } from './context/ThemeContext';

function AuthLayout() {
  // const { isDark } = useTheme();
  return (
    <ThemeProvider>
      
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
      
    </ThemeProvider>
  );
}

export default AuthLayout;
