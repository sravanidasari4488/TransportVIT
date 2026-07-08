import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "./context/AuthProvider";

type LoginRole = "admin" | "student";

function normalizeLoginRole(role: string | string[] | undefined): LoginRole {
  const raw = (Array.isArray(role) ? role[0] : role || "").toLowerCase();
  if (raw === "admin" || raw === "faculty") return "admin";
  return "student";
}

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string | string[] }>();
  const loginRole = useMemo(() => normalizeLoginRole(params.role), [params.role]);
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("vitap@123");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearError();
    if (loginRole === "admin") {
      setUsername("admin@vitap");
      setPassword("vitap@123");
    } else {
      setUsername("");
      setPassword("vitap@123");
    }
  }, [loginRole, clearError]);

  const labels = useMemo(() => {
    if (loginRole === "admin") {
      return {
        title: "Admin / Faculty Login",
        userLabel: "Username",
        placeholder: "admin@vitap",
        hint: "Default: admin@vitap / vitap@123",
      };
    }
    return {
      title: "Student Login",
      userLabel: "Registration Number",
      placeholder: "22BCS1234",
      hint: "Default password: vitap@123",
    };
  }, [loginRole]);

  const handleLogin = async () => {
    try {
      clearError();
      const normalized =
        loginRole === "student" ? username.trim().toUpperCase() : username.trim().toLowerCase();
      const user = await login(normalized, password, loginRole);

      if (user.role === "admin" || user.role === "faculty") {
        router.replace("/Faculty");
      } else if (user.isFirstLogin) {
        router.replace({ pathname: "/(auth)/change-password", params: { regNo: user.regNo } } as any);
      } else {
        router.replace("/Student");
      }
    } catch {
      // handled in context
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{labels.title}</Text>
      <Text style={styles.label}>{labels.userLabel}</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize={loginRole === "student" ? "characters" : "none"}
        placeholder={labels.placeholder}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>{labels.hint}</Text>
      {error ? <Text style={styles.error}>{error.message}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      {loginRole === "student" ? (
        <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password" as any)}>
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={() => router.replace("/(auth)")}>
        <Text style={styles.link}>Back to role selection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  label: { fontSize: 14, marginBottom: 6, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 12 },
  passwordWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, paddingVertical: 12 },
  eyeBtn: { paddingLeft: 8, paddingVertical: 6 },
  hint: { fontSize: 12, color: "#555", marginBottom: 8 },
  button: { backgroundColor: "#3A0CA3", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { color: "#3A0CA3", textAlign: "center", marginTop: 14, fontWeight: "500" },
  error: { color: "#EF4444", marginBottom: 10 },
});
