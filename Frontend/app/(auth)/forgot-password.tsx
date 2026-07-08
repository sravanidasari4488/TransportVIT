import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/AuthProvider";

export default function ForgotPassword() {
  const router = useRouter();
  const { requestPasswordOtp, verifyOtpAndResetPassword } = useAuth();
  const [regNo, setRegNo] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = async () => {
    try {
      await requestPasswordOtp(regNo.trim().toUpperCase());
      setOtpSent(true);
      Alert.alert("Success", "OTP sent to your registered email");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const reset = async () => {
    try {
      await verifyOtpAndResetPassword(regNo.trim().toUpperCase(), otp.trim(), newPassword);
      Alert.alert("Success", "Password reset successful", [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput style={styles.input} value={regNo} onChangeText={setRegNo} placeholder="Registration Number" />
      {!otpSent ? (
        <TouchableOpacity style={styles.button} onPress={sendOtp}><Text style={styles.buttonText}>Send OTP</Text></TouchableOpacity>
      ) : (
        <>
          <TextInput style={styles.input} value={otp} onChangeText={setOtp} placeholder="OTP" keyboardType="number-pad" />
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New Password" secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={reset}><Text style={styles.buttonText}>Reset Password</Text></TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#3A0CA3", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});