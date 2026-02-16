import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bus, MapPin, ArrowRight, Search, Filter, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const busRoutes = [
  {
    city: 'Vijayawada',
    routes: [
      { id: 'vv1', name: 'VV1', from: 'VIT Main Gate', to: 'Kankipadu Junction' },
      { id: 'vv2', name: 'VV2', from: 'VIT Campus', to: 'Vellore Fort' },
      { id: 'vv3', name: 'VV3', from: 'VIT Hostel', to: 'Vellore Market' },
      { id: 'vv4', name: 'VV4', from: 'VIT Library', to: 'Vellore Station' },
      { id: 'vv5', name: 'VV5', from: 'VIT Canteen', to: 'Vellore Hospital' },
      { id: 'vv6', name: 'VV6', from: 'VIT Sports', to: 'Vellore Mall' },
      { id: 'vv7', name: 'VV7', from: 'VIT Admin', to: 'Vellore Temple' },
      { id: 'vv8', name: 'VV8', from: 'VIT Lab', to: 'Vellore Park' },
      { id: 'vv9', name: 'VV9', from: 'VIT Workshop', to: 'Vellore Bank' },
      { id: 'vv10', name: 'VV10', from: 'VIT Auditorium', to: 'Vellore Post Office' },
    ]
  },
  {
    city: 'Guntur',
    routes: [
      { id: 'gv1', name: 'GV1', from: 'VIT-AP Campus', to: 'Guntur Junction' },
      { id: 'gv2', name: 'GV2', from: 'VIT-AP Hostel', to: 'Guntur Market' },
      { id: 'gv3', name: 'GV3', from: 'VIT-AP Library', to: 'Guntur Station' },
      { id: 'gv4', name: 'GV4', from: 'VIT-AP Canteen', to: 'Guntur Hospital' },
      { id: 'gv5', name: 'GV5', from: 'VIT-AP Sports', to: 'Guntur Mall' },
      { id: 'gv6', name: 'GV6', from: 'VIT-AP Admin', to: 'Guntur Temple' },
      { id: 'gv7', name: 'GV7', from: 'VIT-AP Lab', to: 'Guntur Park' },
      { id: 'gv8', name: 'GV8', from: 'VIT-AP Workshop', to: 'Guntur Bank' },
      { id: 'gv9', name: 'GV9', from: 'VIT-AP Auditorium', to: 'Guntur Post Office' },
      { id: 'gv10', name: 'GV10', from: 'VIT-AP Gate', to: 'Guntur Bus Stand' },
    ]
  }
];

export default function BusRoutes() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  const handleBackPress = () => {
    router.back();
  };

  const handleRoutePress = (routeId: string) => {
    router.push(`/routes/${routeId}`);
  };

  const theme = colors[isDark ? 'dark' : 'light'];

  const filteredRoutes = busRoutes.map(citySection => ({
    ...citySection,
    routes: citySection.routes.filter(route =>
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.to.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(citySection => citySection.routes.length > 0);

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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Bus Routes</Text>
            <Text style={styles.headerSubtitle}>Monitor bus operations</Text>
          </View>
          <View style={styles.placeholder} />
        </Animated.View>
      </LinearGradient>

      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Search size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search routes..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearButton, { color: theme.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutes.map((citySection, cityIndex) => (
          <Animated.View
            key={cityIndex}
            style={[
              styles.citySection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.cityHeader}>
              <LinearGradient
                colors={[theme.primary + '20', theme.primary + '10']}
                style={styles.cityIconContainer}
              >
                <MapPin size={22} color={theme.primary} />
              </LinearGradient>
              <View style={styles.cityInfo}>
                <Text style={[styles.cityTitle, { color: theme.text }]}>{citySection.city} Routes</Text>
                <Text style={[styles.citySubtitle, { color: theme.textSecondary }]}>
                  {citySection.routes.length} route{citySection.routes.length !== 1 ? 's' : ''} available
                </Text>
              </View>
            </View>
            <View style={styles.routesGrid}>
              {citySection.routes.map((route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onPress={() => handleRoutePress(route.id)}
                  delay={index * 40}
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                  theme={theme}
                />
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

interface RouteCardProps {
  route: { id: string; name: string; from: string; to: string };
  onPress: () => void;
  delay: number;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  theme: any;
}

const RouteCard = ({ route, onPress, delay, fadeAnim, slideAnim, theme }: RouteCardProps) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
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
          {
            backgroundColor: theme.surface,
            borderColor: isPressed ? theme.primary : theme.border,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.primary + '10', 'transparent']}
          style={styles.routeCardGradient}
        >
          <View style={styles.routeCardContent}>
            <View style={styles.routeHeader}>
              <View style={[styles.routeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Bus size={24} color={theme.primary} strokeWidth={2.5} />
                <View style={styles.sparkleBadge}>
                  <Sparkles size={10} color={theme.primary} fill={theme.primary} />
                </View>
              </View>
              <Text style={[styles.routeName, { color: theme.text }]}>{route.name}</Text>
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.routeText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {route.from}
                </Text>
              </View>
              <View style={[styles.routeDivider, { backgroundColor: theme.border }]} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.routeText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {route.to}
                </Text>
              </View>
            </View>
            <View style={styles.routeArrow}>
              <LinearGradient
                colors={[theme.primary, theme.accent]}
                style={styles.arrowGradient}
              >
                <ArrowRight size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  citySection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cityInfo: {
    flex: 1,
  },
  cityTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  citySubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  routesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  routeCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  routeCardGradient: {
    padding: 18,
  },
  routeCardContent: {
    position: 'relative',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  routeName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeDetails: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  routeDivider: {
    height: 1,
    marginVertical: 8,
    marginLeft: 18,
  },
  routeArrow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  arrowGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
