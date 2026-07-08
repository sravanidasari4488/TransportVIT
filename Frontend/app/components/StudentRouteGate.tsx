import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../(auth)/context/AuthProvider";
import { useTheme } from "../(auth)/context/ThemeContext";
import { colors } from "../constants/colors";
import { getStudentAssignedRoute } from "../utils/routeAccess";

type Props = {
  children: React.ReactNode;
};

export default function StudentRouteGate({ children }: Props) {
  const { user, selectedRouteId, isLoading } = useAuth();
  const { isDark } = useTheme();
  const theme = colors[isDark ? "dark" : "light"];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (user?.role === "student") {
    const assigned = getStudentAssignedRoute(user, selectedRouteId);
    if (!assigned) {
      return (
        <View style={[styles.centered, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>No route assigned</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Please contact admin to assign your bus route.
          </Text>
        </View>
      );
    }
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
