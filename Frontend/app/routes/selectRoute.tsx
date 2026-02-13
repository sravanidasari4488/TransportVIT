import React, {useState} from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../(auth)/context/AuthProvider";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
const routes = [
  { name: "VV1", city: "Vijayawada" },
  { name: "VV2", city: "Vijayawada" },
  { name: "VV3", city: "Vijayawada" },
  { name: "VV4", city: "Vijayawada" },
  { name: "VV5", city: "Vijayawada" },
  { name: "VV6", city: "Vijayawada" },
  { name: "VV7", city: "Vijayawada" },
  { name: "VV8", city: "Vijayawada" },
  { name: "VV9", city: "Vijayawada" },
  { name: "VV10", city: "Vijayawada" },
  { name: "GV1", city: "Guntur" },
  { name: "GV2", city: "Guntur" },
  { name: "GV3", city: "Guntur" },
  { name: "GV4", city: "Guntur" },
  { name: "GV5", city: "Guntur" },
  { name: "GV6", city: "Guntur" },
  { name: "GV7", city: "Guntur" },
  { name: "GV8", city: "Guntur" },
  { name: "GV9", city: "Guntur" },
  { name: "GV10", city: "Guntur" },
];


export default function SelectRoute() {
  const { setSelectedRouteId, user } = useAuth(); // Assuming your AuthProvider provides a token
  const [selectedRoute, setSelectedRoute] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSelectRoute = async (routeName: string, userId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
    await axios.post('https://vit-bus-backend-production.up.railway.app/api/route', {
      userId,
      selectedRoute: routeName,
    });
    console.log('Route saved');
  } catch (error) {
    console.error('Failed to save route:', error);
  }
    // try {
    //   // First set in local context
    //   setSelectedRouteId(route);
    //    await AsyncStorage.setItem('selectedRoute', route);
    //   // Redirect to next page only after successful save
    //   router.replace('/(tabs)');
    // } 
    // catch (error) {
    //   console.error('Error saving route:', error);
    //   Alert.alert("Error", error instanceof Error ? error.message : "Failed to save your route selection. Please try again.");
    // } 
    finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.safeArea}>
        <Text style={styles.header}>Select your Bus Route</Text>

        {/* Vijayawada Section */}
        <View style={styles.citySection}>
          <Text style={styles.cityTitle}>📍 Vijayawada</Text>
          <View style={styles.routeContainer}>
            {routes.filter(route => route.city === "Vijayawada").map(route => (
              <TouchableOpacity 
                key={route.name} 
                style={[
                  styles.routeButton,
                  selectedRoute === route.name && styles.selectedRouteButton,
                  isLoading && styles.disabledButton
                ]} 
                onPress={async () => {
                  // setSelectedRoute(route.name);
                  setSelectedRouteId(route.name);
                  //handleSelectRoute(route.name);
                  await AsyncStorage.setItem('selectedRoute', route.name);
                  router.replace('/(tabs)');
                }}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.routeText}>{route.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guntur Section */}
        <View style={styles.citySection}>
          <Text style={styles.cityTitle}>📍 Guntur</Text>
          <View style={styles.routeContainer}>
            {routes.filter(route => route.city === "Guntur").map(route => (
              <TouchableOpacity 
                key={route.name} 
                style={[
                  styles.routeButton,
                  selectedRoute === route.name && styles.selectedRouteButton,
                  isLoading && styles.disabledButton
                ]} 
                onPress={async () => {
                  setSelectedRouteId(route.name);
                  //handleSelectRoute(route.name);
                  setSelectedRouteId(route.name);
                  await AsyncStorage.setItem('selectedRoute', route.name); // this is correct
  router.replace('/(tabs)');
                }}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.routeText}>{route.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 60,
    marginBottom: 30,
    color: "#3B2F2F",
    
    textAlign: "center",
  },
  citySection: {
    width: "100%",
    backgroundColor: "orange",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  cityTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3B2F2F",
    marginBottom: 16,
  },
  routeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  routeButton: {
    width: "48%",
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedRouteButton: {
    backgroundColor: "#E2E8F0",
    borderColor: "#3B2F2F",
  },
  disabledButton: {
    opacity: 0.6,
  },
  routeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B2F2F",
  },
});
