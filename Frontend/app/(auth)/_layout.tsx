import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}