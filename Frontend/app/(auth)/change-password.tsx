import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "./context/AuthProvider";

export default function ChangePassword() {
  const router = useRouter();
  const { regNo } = useLocalSearchParams<{ regNo: string }>();
  const { changePasswordFirstLogin } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const submit = async () => {
    try {
      await changePasswordFirstLogin((regNo || "").toUpperCase(), oldPassword, newPassword);
      Alert.alert("Success", "Password updated", [{ text: "OK", onPress: () => router.replace("/Student") }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      <Text style={styles.subtitle}>First login detected. Please set a new password.</Text>
      <TextInput style={styles.input} value={oldPassword} onChangeText={setOldPassword} placeholder="Current Password" secureTextEntry />
      <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New Password (min 8 chars)" secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Update Password</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 18 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#3A0CA3", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});