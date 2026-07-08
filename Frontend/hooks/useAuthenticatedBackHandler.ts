import { useCallback, useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "../app/(auth)/context/AuthProvider";

function isAtDashboardRoot(segments: string[]): boolean {
  const root = segments[0];
  const leaf = segments[segments.length - 1];
  if (root === "Student") {
    return segments.length === 1 || leaf === "index";
  }
  if (root === "Faculty") {
    return segments.length === 1 || leaf === "index";
  }
  return false;
}

export function useAuthenticatedBackHandler() {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();

  const onBackPress = useCallback(() => {
    if (!user) return false;

    const inAuth = segments[0] === "(auth)" || segments.includes("(auth)" as never);
    if (inAuth) return false;

    if (segments[0] === "routes") {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      const home = user.role === "student" ? "/Student" : "/Faculty";
      router.replace(home as any);
      return true;
    }

    if (!isAtDashboardRoot(segments) && router.canGoBack()) {
      router.back();
      return true;
    }

    return true;
  }, [user, router, segments]);

  useEffect(() => {
    if (!user) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [user, onBackPress]);
}
