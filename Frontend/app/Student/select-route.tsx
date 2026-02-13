import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../(auth)/context/AuthProvider';
import { useRouter } from 'expo-router';
import { useTheme } from '../(auth)/context/ThemeContext';
import { API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';

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
  const { user, setSelectedRouteId, selectedRouteId } = useAuth();
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
      if (!user?.uid) {
        setCheckingRoute(false);
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user?.selectedRoute) {
          // Student already has a route selected, redirect to dashboard
          setSelectedRouteId(data.user.selectedRoute);
          router.replace('/Student');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking route:', error);
    } finally {
      setCheckingRoute(false);
    }
  };

  const handleSelectRoute = async (routeName: string) => {
    if (isLoading || !user?.uid) return;
    
    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      
      // First, ensure user exists in backend
      const userResponse = await fetch(`${API_CONFIG.BASE_URL}/api/users/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // If user doesn't exist, create them
      if (!userResponse.ok || userResponse.status === 404) {
        const createUserResponse = await fetch(`${API_CONFIG.BASE_URL}/api/users/create-or-update`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Student',
            photoURL: user.photoURL || null,
            firebaseUid: user.uid,
            role: 'student',
          }),
        });

        if (!createUserResponse.ok) {
          const errorData = await createUserResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create user');
        }
      }
      
      // Update user's selected route in backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${user.uid}/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedRoute: routeName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Save route in local state
          await setSelectedRouteId(routeName);
          // Redirect to student dashboard
          router.replace('/Student');
        } else {
          const errorData = await response.json().catch(() => ({}));
          Alert.alert('Error', errorData.error || 'Failed to save route selection. Please try again.');
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'Failed to save route';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('API Error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to save route:', error);
      Alert.alert('Error', error.message || 'Failed to save your route selection. Please try again.');
    } finally {
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
        <Text style={styles.header}>Select your Bus Route</Text>
        <Text style={styles.subtitle}>Choose the route you use to travel to campus</Text>

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
                onPress={() => {
                  setSelectedRoute(route.name);
                  handleSelectRoute(route.name);
                }}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[
                  styles.routeText,
                  selectedRoute === route.name && styles.selectedRouteText
                ]}>{route.name}</Text>
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
                onPress={() => {
                  setSelectedRoute(route.name);
                  handleSelectRoute(route.name);
                }}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[
                  styles.routeText,
                  selectedRoute === route.name && styles.selectedRouteText
                ]}>{route.name}</Text>
              </TouchableOpacity>
            ))}
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

