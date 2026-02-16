import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  Animated,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { ArrowLeft, Bus, MapPin, Navigation, ArrowRight, CheckCircle, Sparkles, Clock, Users } from 'lucide-react-native';
import { API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';
import { colors } from '../constants/colors';

const { width } = Dimensions.get('window');

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    fetchUserRoute();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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

  const theme = colors[isDark ? 'dark' : 'light'];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your route...</Text>
        </View>
      </View>
    );
  }

  const displayRoute = userRoute || selectedRouteId;

  if (!displayRoute) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />
        
        {/* Ombre Header */}
        <LinearGradient
          colors={theme.gradientOmbreHeader || theme.gradientOmbre}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Route</Text>
            <View style={styles.placeholder} />
          </Animated.View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <Animated.View
            style={[
              styles.emptyIconContainer,
              {
                backgroundColor: theme.primary + '20',
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Bus size={64} color={theme.primary} strokeWidth={2} />
          </Animated.View>
          <Animated.Text style={[styles.emptyText, { color: theme.text }, { opacity: fadeAnim }]}>
            No Route Selected
          </Animated.Text>
          <Animated.Text style={[styles.emptySubtext, { color: theme.textSecondary }, { opacity: fadeAnim }]}>
            Select your bus route to start tracking
          </Animated.Text>
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={handleChangeRoute}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark ? theme.gradientOmbre : ['#3A0CA3', '#2A0A7A', '#1A0A4A']}
                style={styles.selectButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MapPin size={20} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Select Route</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  const city = routeCityMap[displayRoute.toUpperCase()] || 'Unknown';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />

      {/* Header */}
      <LinearGradient
        colors={theme.gradientOmbreHeader || theme.gradientOmbre}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My Route</Text>
            <Text style={styles.headerSubtitle}>{city}</Text>
          </View>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangeRoute}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Route Card */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? theme.gradientOmbre : ['#3A0CA3', '#2A0A7A', '#1A0A4A']}
            style={styles.heroCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroCardContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIconWrapper}>
                  <Bus size={36} color="#FFFFFF" strokeWidth={2.5} />
                  <View style={styles.sparkleContainer}>
                    <Sparkles size={16} color="#FFD700" fill="#FFD700" />
                  </View>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroRouteName}>{displayRoute.toUpperCase()}</Text>
                  <View style={styles.heroCityRow}>
                    <MapPin size={18} color="rgba(255, 255, 255, 0.9)" />
                    <Text style={styles.heroCityText}>{city}</Text>
                  </View>
                </View>
                <View style={styles.heroBadge}>
                  <CheckCircle size={28} color="#FFFFFF" fill="#10B981" />
                </View>
              </View>
              
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Clock size={18} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.heroStatText}>Live Tracking</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Users size={18} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.heroStatText}>Active</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleRoutePress(displayRoute)}
                activeOpacity={0.8}
              >
                <Text style={styles.heroActionText}>View Full Route Details</Text>
                <ArrowRight size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions Grid */}
        <Animated.View
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => handleRoutePress(displayRoute)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.primary + '15', theme.primary + '05']}
              style={styles.actionCardGradient}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
                <Navigation size={28} color={theme.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Live Tracking</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>Real-time location</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => handleRoutePress(displayRoute)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.accent + '15', theme.accent + '05']}
              style={styles.actionCardGradient}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.accent + '20' }]}>
                <Bus size={28} color={theme.accent} />
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Schedule</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>View timings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Route Information</Text>
          </View>
          <View style={styles.infoCardContent}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Route ID</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{displayRoute.toUpperCase()}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>City</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{city}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[styles.statusText, { color: theme.success }]}>Active</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '400',
  },
  placeholder: {
    width: 40,
  },
  changeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '400',
  },
  selectButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3A0CA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 10,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#3A0CA3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroCardGradient: {
    padding: 28,
  },
  heroCardContent: {
    gap: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  heroInfo: {
    flex: 1,
  },
  heroRouteName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  heroCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCityText: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  heroStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStatText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 18,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardHeader: {
    marginBottom: 20,
  },
  infoCardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoCardContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default BusRoutesScreen;
