import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../(auth)/context/AuthProvider';
import { useRouter } from 'expo-router';
import { useTheme } from '../(auth)/context/ThemeContext';

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
  const { user, setSelectedRouteId } = useAuth();
  const { isDark } = useTheme();
  const [selectedRoute, setSelectedRoute] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingRoute, setCheckingRoute] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkExistingRoute();
  }, []);

  const checkExistingRoute = async () => {
    try {
      const assignedRoute = user?.busRoute?.toUpperCase?.();
      if (!assignedRoute) {
        setCheckingRoute(false);
        return;
      }

      await AsyncStorage.setItem(`selectedRoute_`, assignedRoute);
      await setSelectedRouteId(assignedRoute);
      setSelectedRoute(assignedRoute);
      router.replace('/Student');
    } catch (error) {
      console.error('Error checking route:', error);
    } finally {
      setCheckingRoute(false);
    }
  };

  const handleSelectRoute = async (routeName: string) => {
    if (isLoading || !user?.regNo) return;
    
    setIsLoading(true);
    try {
      // Always save to local storage first (works offline)
      await AsyncStorage.setItem(`selectedRoute_`, routeName);
      await setSelectedRouteId(routeName);
      
      // Redirect immediately (don't wait for backend)
      router.replace('/Student');
    } catch (error: any) {
      console.error('Failed to save route:', error);
      Alert.alert(
        'Error', 
        'Failed to save your route selection. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const styles = getStyles(isDark);

  if (checkingRoute) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={[styles.loadingText, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Checking your route...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.safeArea}>
        <Text style={styles.header}>Route is Assigned by Admin</Text>
        <Text style={styles.subtitle}>Students can only use the route uploaded in CSV/Excel</Text>

        <View style={styles.citySection}>
          <Text style={styles.cityTitle}>Assigned Route</Text>
          <View style={styles.routeContainer}>
            {user?.busRoute ? (
              <TouchableOpacity
                style={[styles.routeButton, styles.selectedRouteButton, isLoading && styles.disabledButton]}
                onPress={() => handleSelectRoute((user.busRoute || "").toUpperCase())}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[styles.routeText, styles.selectedRouteText]}>{user.busRoute.toUpperCase()}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontWeight: '600' }}>
                No route assigned. Contact admin.
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    color: isDark ? '#F1F5F9' : '#1E293B',
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    marginBottom: 30,
    textAlign: "center",
  },
  citySection: {
    width: "100%",
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  cityTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: isDark ? '#F1F5F9' : '#1E293B',
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
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#E2E8F0',
  },
  selectedRouteButton: {
    backgroundColor: isDark ? '#3366FF' : '#3366FF',
    borderColor: '#3366FF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  routeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  selectedRouteText: {
    color: '#FFFFFF',
  },
});

