import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Bus, MapPin, Clock, TrendingUp, BarChart3, Bell, Activity, Users, Route } from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';

const { width } = Dimensions.get('window');

const features = [
  {
    icon: MapPin,
    title: 'Live Bus Monitoring',
    description: 'Track buses in real-time with GPS and activity status.',
  },
  {
    icon: Clock,
    title: 'Performance Metrics',
    description: 'Review punctuality, adherence, and trip durations.',
  },
  {
    icon: Bell,
    title: 'Alerts & Notifications',
    description: 'Get notified about delays, issues, or route changes instantly.',
  },
  {
    icon: BarChart3,
    title: 'Arrival Analytics',
    description: 'Monitor arrival data and performance trends.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSearchPress = () => {
    router.push('/Faculty/bus-routes');
  };

  const handleViewAllPress = () => {
    router.push('/Faculty/bus-routes');
  };

  const handleFeaturePress = (featureIndex: number) => {
    switch (featureIndex) {
      case 0: // Live Monitoring
        router.push('/Faculty/bus-routes');
        break;
      case 1: // Performance Metrics
        router.push('/Faculty/arrival-dashboard');
        break;
      case 2: // Alerts
        router.push('/Faculty/arrival-dashboard');
        break;
      case 3: // Analytics
        router.push('/Faculty/arrival-dashboard');
        break;
    }
  };

  // Get user display name or fallback to email prefix
  const getUserDisplayName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'User';
  };

  // Get user photo or default avatar
  const getUserPhoto = () => {
    if (user?.photoURL) {
      return { uri: user.photoURL };
    }
    // Return a default avatar based on user's name
    const name = getUserDisplayName();
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=fff&size=150` };
  };

  const styles = getStyles(isDark);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1E293B' : '#FFFFFF'} />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome Back 👋</Text>
              <Text style={styles.title}>Faculty Transport Portal</Text>
              <Text style={styles.subtitle}>Bus Oversight & Analytics · VIT-AP</Text>
            </View>
            <View style={styles.photoContainer}>
              <Image
                source={getUserPhoto()}
                style={styles.profilePhoto}
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchBar, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity 
          style={styles.searchTouchable} 
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <Search size={20} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text style={styles.searchText}>Search or inspect bus operations...</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Dashboard Features */}
      <View style={styles.section}>
        <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          <BarChart3 size={20} color={isDark ? '#3B82F6' : '#2563EB'} />
          <Text style={styles.sectionTitle}>Dashboard Capabilities</Text>
        </Animated.View>
        {features.map((feature, index) => (
          <Animated.View 
            key={index} 
            style={[
              styles.featureCard,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.featureTouchable}
              onPress={() => handleFeaturePress(index)}
              activeOpacity={0.7}
            >
              <View style={styles.featureIcon}>
                <feature.icon size={24} color={isDark ? '#3B82F6' : '#2563EB'} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Route size={20} color={isDark ? '#94A3B8' : '#64748B'} style={styles.featureArrow} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Buttons */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleViewAllPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>🚍 View All Operations</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.push('/Faculty/arrival-dashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>📊 View Arrival Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F9FAFB',
  },
  header: {
    backgroundColor: isDark ? '#1E293B' : '#1E3A8A',
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: isDark ? '#CBD5E1' : '#CBD5E1',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#E2E8F0',
  },
  photoContainer: {
    marginLeft: 20,
  },
  profilePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchBar: {
    marginHorizontal: 20,
    marginTop: -25,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    padding: 14,
    borderRadius: 14,
  },
  searchText: {
    marginLeft: 12,
    fontSize: 15,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  featureCard: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featureTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    backgroundColor: isDark ? '#334155' : '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  featureArrow: {
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: isDark ? '#3B82F6' : '#2563EB',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: isDark ? '#1E40AF' : '#1E40AF',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
