import React from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ShieldCheck, GraduationCap } from "lucide-react-native";
import { useAuth } from "./context/AuthProvider";

export default function AuthIndex() {
  const router = useRouter();
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Login Type</Text>
      <Text style={styles.subtitle}>Select your role to continue</Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.squareCard}
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { role: "admin" },
            })
          }
          activeOpacity={0.9}
        >
          <ShieldCheck size={52} color="#fff" />
          <Text style={styles.cardText}>Admin</Text>
          <Text style={styles.cardHint}>admin@vitap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.squareCard, styles.studentCard]}
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { role: "student" },
            })
          }
          activeOpacity={0.9}
        >
          <GraduationCap size={52} color="#fff" />
          <Text style={styles.cardText}>Student</Text>
          <Text style={styles.cardHint}>Reg No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 24,
  },
  grid: {
    width: "100%",
    maxWidth: 380,
    flexDirection: "row",
    gap: 14,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 0.95,
    backgroundColor: "#3A0CA3",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  studentCard: {
    backgroundColor: "#2563EB",
  },
  cardText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  cardHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
});
