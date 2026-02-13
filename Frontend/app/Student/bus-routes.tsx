import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { ArrowLeft, Bus, MapPin } from 'lucide-react-native';
import { API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';

const routeCityMap: Record<string, string> = {
  "VV1": "Vijayawada", "VV2": "Vijayawada", "VV3": "Vijayawada", "VV4": "Vijayawada", "VV5": "Vijayawada",
  "VV6": "Vijayawada", "VV7": "Vijayawada", "VV8": "Vijayawada", "VV9": "Vijayawada", "VV10": "Vijayawada",
  "GV1": "Guntur", "GV2": "Guntur", "GV3": "Guntur", "GV4": "Guntur", "GV5": "Guntur",
  "GV6": "Guntur", "GV7": "Guntur", "GV8": "Guntur", "GV9": "Guntur", "GV10": "Guntur",
};

function BusRoutesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user, selectedRouteId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRoute, setUserRoute] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRoute();
  }, []);

  const fetchUserRoute = async () => {
    try {
      if (!user?.uid) {
        setLoading(false);
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
          setUserRoute(data.user.selectedRoute);
        }
      }
    } catch (error) {
      console.error('Error fetching user route:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleRoutePress = (routeId: string) => {
    router.push(`/routes/${routeId.toLowerCase()}`);
  };

  const handleChangeRoute = () => {
    router.push('/Student/select-route');
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={[styles.loadingText, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Loading your route...</Text>
      </View>
    );
  }

  const displayRoute = userRoute || selectedRouteId;

  if (!displayRoute) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1E293B' : '#FFFFFF'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ArrowLeft size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bus Route</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Bus size={64} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={[styles.emptyText, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>No Route Selected</Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Please select a bus route to view details
          </Text>
          <TouchableOpacity style={styles.selectButton} onPress={handleChangeRoute}>
            <Text style={styles.selectButtonText}>Select Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const city = routeCityMap[displayRoute.toUpperCase()] || 'Unknown';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1E293B' : '#FFFFFF'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ArrowLeft size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bus Route</Text>
        <TouchableOpacity style={styles.changeButton} onPress={handleChangeRoute}>
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeSection}>
          <Text style={styles.sectionTitle}>📍 {city}</Text>
          <TouchableOpacity
            style={styles.routeButton}
            onPress={() => handleRoutePress(displayRoute)}
            activeOpacity={0.7}
          >
            <View style={styles.routeHeader}>
              <Bus size={24} color={isDark ? '#3B82F6' : '#1D4ED8'} />
              <Text style={styles.routeName}>{displayRoute.toUpperCase()}</Text>
            </View>
            <View style={styles.routeDetails}>
              <MapPin size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={styles.routeText}>Tap to view route details</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  changeButton: {
    padding: 8,
  },
  changeButtonText: {
    color: '#3366FF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  selectButton: {
    backgroundColor: '#3366FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  routeSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 16,
  },
  routeButton: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginLeft: 12,
  },
  routeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    marginLeft: 8,
  },
});

export default BusRoutesScreen;
