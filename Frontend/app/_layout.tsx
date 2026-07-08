import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthenticatedBackHandler } from '@/hooks/useAuthenticatedBackHandler';
import { AuthProvider, isPickingFileRef, useAuth } from './(auth)/context/AuthProvider';
import { ThemeProvider,useTheme } from './(auth)/context/ThemeContext';

function AppResumeAuthReset() {
  const router = useRouter();
  const { logout } = useAuth();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (isPickingFileRef.current) {
        appState.current = nextState;
        return;
      }
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        await logout();
        router.replace('/(auth)');
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [logout, router]);

  return null;
}

function AuthenticatedBackGuard() {
  const { user } = useAuth();
  useAuthenticatedBackHandler();
  if (!user) return null;
  return null;
}

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <AppResumeAuthReset />
      <AuthenticatedBackGuard />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <AuthProvider>
        {/* <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" /> */}
         <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default RootLayout;
