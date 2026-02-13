// app/routes/index.tsx
import { useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useAuth } from "../(auth)/context/AuthProvider";

export default function RoutesRedirect() {
  const router = useRouter();
  const { selectedRouteId } = useAuth();

  useEffect(() => {
    const redirectToSelectedRoute = async () => {
      try {
        const storedRoute = selectedRouteId || await AsyncStorage.getItem("selectedRoute");
        if (storedRoute) {
          router.replace(`/routes/${storedRoute.toLowerCase()}`);
        } else {
          Alert.alert("No route selected", "Please select a route first.");
        }
      } catch (error) {
        console.error("Error reading route:", error);
        Alert.alert("Error", "Could not retrieve route info.");
      }
    };

    redirectToSelectedRoute();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#3366FF" />
      <Text style={{ marginTop: 10 }}>Loading your route...</Text>
    </View>
  );
}
