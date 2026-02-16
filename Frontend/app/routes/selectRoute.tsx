import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "../(auth)/context/AuthProvider";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { MapPin, Bus, Sparkles, ArrowRight, CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const routes = [
  { name: "VV1", city: "Vijayawada", color: "#FF6B35" },
  { name: "VV2", city: "Vijayawada", color: "#F7931E" },
  { name: "VV3", city: "Vijayawada", color: "#FFD23F" },
  { name: "VV4", city: "Vijayawada", color: "#00D4AA" },
  { name: "VV5", city: "Vijayawada", color: "#2196F3" },
  { name: "VV6", city: "Vijayawada", color: "#9C27B0" },
  { name: "VV7", city: "Vijayawada", color: "#E91E63" },
  { name: "VV8", city: "Vijayawada", color: "#FF5722" },
  { name: "VV9", city: "Vijayawada", color: "#00BCD4" },
  { name: "VV10", city: "Vijayawada", color: "#4CAF50" },
  { name: "GV1", city: "Guntur", color: "#FF6B35" },
  { name: "GV2", city: "Guntur", color: "#F7931E" },
  { name: "GV3", city: "Guntur", color: "#FFD23F" },
  { name: "GV4", city: "Guntur", color: "#00D4AA" },
  { name: "GV5", city: "Guntur", color: "#2196F3" },
  { name: "GV6", city: "Guntur", color: "#9C27B0" },
  { name: "GV7", city: "Guntur", color: "#E91E63" },
  { name: "GV8", city: "Guntur", color: "#FF5722" },
  { name: "GV9", city: "Guntur", color: "#00BCD4" },
  { name: "GV10", city: "Guntur", color: "#4CAF50" },
];

export default function SelectRoute() {
  const { setSelectedRouteId, user } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
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

  const handleSelectRoute = async (routeName: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSelectedRoute(routeName);
    
    try {
      if (user?.id) {
        await axios.post('https://vit-bus-backend-production.up.railway.app/api/route', {
          userId: user.id,
          selectedRoute: routeName,
        });
      }
      
      setSelectedRouteId(routeName);
      await AsyncStorage.setItem('selectedRoute', routeName);
      
      // Add a small delay for better UX
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 300);
    } catch (error) {
      console.error('Failed to save route:', error);
      Alert.alert("Error", "Failed to save your route selection. Please try again.");
      setSelectedRoute('');
    } finally {
      setIsLoading(false);
    }
  };

  const vijayawadaRoutes = routes.filter(route => route.city === "Vijayawada");
  const gunturRoutes = routes.filter(route => route.city === "Guntur");

  const theme = colors.light;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
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
          <View style={styles.iconWrapper}>
            <Bus size={32} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.headerTitle}>Choose Your Route</Text>
          <Text style={styles.headerSubtitle}>Select your bus route to start tracking</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vijayawada Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MapPin size={24} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Vijayawada Routes</Text>
              <Text style={styles.sectionSubtitle}>{vijayawadaRoutes.length} routes available</Text>
            </View>
          </View>
          <View style={styles.routeGrid}>
            {vijayawadaRoutes.map((route, index) => (
              <RouteCard
                key={route.name}
                route={route}
                isSelected={selectedRoute === route.name}
                onPress={() => handleSelectRoute(route.name)}
                isLoading={isLoading}
                delay={index * 50}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
              />
            ))}
          </View>
        </Animated.View>

        {/* Guntur Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MapPin size={24} color={theme.accent} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Guntur Routes</Text>
              <Text style={styles.sectionSubtitle}>{gunturRoutes.length} routes available</Text>
            </View>
          </View>
          <View style={styles.routeGrid}>
            {gunturRoutes.map((route, index) => (
              <RouteCard
                key={route.name}
                route={route}
                isSelected={selectedRoute === route.name}
                onPress={() => handleSelectRoute(route.name)}
                isLoading={isLoading}
                delay={(vijayawadaRoutes.length + index) * 50}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

interface RouteCardProps {
  route: { name: string; city: string; color: string };
  isSelected: boolean;
  onPress: () => void;
  isLoading: boolean;
  delay: number;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const RouteCard = ({ route, isSelected, onPress, isLoading, delay, fadeAnim, slideAnim }: RouteCardProps) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: cardAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.routeCard,
          isSelected && styles.routeCardSelected,
          isLoading && styles.routeCardDisabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isLoading}
      >
        <LinearGradient
          colors={isSelected ? [route.color, route.color + 'DD'] : ['#FFFFFF', '#F8F9FA']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isSelected && (
            <View style={styles.selectedBadge}>
              <CheckCircle size={20} color="#FFFFFF" />
            </View>
          )}
          <View style={[styles.routeIconContainer, { backgroundColor: route.color + '20' }]}>
            <Bus size={28} color={route.color} strokeWidth={2} />
          </View>
          <Text style={[styles.routeName, isSelected && styles.routeNameSelected]}>
            {route.name}
          </Text>
          <View style={styles.routeFooter}>
            <MapPin size={12} color={isSelected ? '#FFFFFF' : route.color} />
            <Text style={[styles.routeCity, isSelected && styles.routeCitySelected]}>
              {route.city}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.arrowContainer}>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  routeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  routeCard: {
    width: CARD_WIDTH,
    height: 140,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  routeCardSelected: {
    shadowColor: colors.light.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  routeCardDisabled: {
    opacity: 0.6,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.light.text,
    marginBottom: 4,
  },
  routeNameSelected: {
    color: '#FFFFFF',
  },
  routeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeCity: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeCitySelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
});
