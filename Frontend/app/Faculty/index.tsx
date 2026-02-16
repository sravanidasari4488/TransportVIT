import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Dimensions, 
  Animated, 
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  Bus, 
  MapPin, 
  BarChart3, 
  Bell, 
  ArrowRight,
  TrendingUp,
  Activity,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets
} from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const features = [
  {
    icon: Bus,
    title: 'Bus Routes',
    subtitle: 'Manage routes',
    color: '#3A0CA3',
    route: '/Faculty/bus-routes',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    subtitle: 'View reports',
    color: '#7209B7',
    route: '/Faculty/arrival-dashboard',
  },
  {
    icon: Activity,
    title: 'Live Tracking',
    subtitle: 'Monitor buses',
    color: '#560BAD',
    route: '/Faculty/bus-routes',
  },
];

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
}

export default function HomePage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  // Initialize with default weather so it always shows something
  const [weather, setWeather] = useState<WeatherData | null>({
    temperature: 28,
    condition: 'Clear',
    description: 'Loading weather...',
    icon: '01d',
    humidity: 60,
    windSpeed: 5,
  });
  const [weatherLoading, setWeatherLoading] = useState(true);

  const OPENWEATHER_API_KEY = '7cf3a5cfde1ecd173c14790d1ca80987';
  // Default location: VIT-AP University, Amaravati, Andhra Pradesh, India
  const DEFAULT_LAT = 16.5062;
  const DEFAULT_LON = 80.6480;

  useEffect(() => {
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
    ]).start();
  }, []);

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      console.log('🌤️ Fetching weather data...');
      // Using default location (VIT-AP University)
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Weather API error:', response.status, errorText);
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Weather data received:', data);
      
      const weatherData = {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
      };
      
      console.log('🌤️ Setting weather:', weatherData);
      setWeather(weatherData);
    } catch (error) {
      console.error('❌ Error fetching weather:', error);
      // Set default weather on error so it always shows something
      const defaultWeather = {
        temperature: 28,
        condition: 'Clear',
        description: 'Clear sky',
        icon: '01d',
        humidity: 60,
        windSpeed: 5,
      };
      console.log('🌤️ Using default weather:', defaultWeather);
      setWeather(defaultWeather);
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherIcon = (condition: string, icon: string) => {
    const isDay = icon.includes('d');
    
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun size={32} color="#FFA500" strokeWidth={2} />;
      case 'clouds':
        return <Cloud size={32} color="#87CEEB" strokeWidth={2} />;
      case 'rain':
      case 'drizzle':
        return <CloudRain size={32} color="#4682B4" strokeWidth={2} />;
      case 'thunderstorm':
        return <CloudLightning size={32} color="#4B0082" strokeWidth={2} />;
      case 'snow':
        return <CloudSnow size={32} color="#E0E0E0" strokeWidth={2} />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <Wind size={32} color="#C0C0C0" strokeWidth={2} />;
      default:
        return <Sun size={32} color="#FFA500" strokeWidth={2} />;
    }
  };

  const handleSearchPress = () => {
    router.push('/Faculty/bus-routes');
  };

  const getUserDisplayName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Faculty';
  };

  const getUserPhoto = () => {
    if (user?.photoURL) {
      return { uri: user.photoURL };
    }
    const name = getUserDisplayName();
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3A0CA3&color=fff&size=150` };
  };

  const theme = colors[isDark ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />
      
      {/* Ombre Gradient Header */}
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
          <View style={styles.headerTop}>
            <View style={styles.welcomeSection}>
              <Text style={styles.greeting}>Hello {getUserDisplayName()} 👋</Text>
              <Text style={styles.headerTitle}>Dashboard Overview</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/Faculty/ProfilePage')}
            >
              <Image source={getUserPhoto()} style={styles.profilePhoto} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Stats Card */}
        <Animated.View
          style={[
            styles.statsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? theme.gradientOmbreCard || theme.gradientOmbre : ['#3A0CA3', '#2A0A7A', '#1A0A4A']}
            style={styles.statsCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>20</Text>
                <Text style={styles.statLabel}>Active Routes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>15</Text>
                <Text style={styles.statLabel}>Buses Online</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>98%</Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Weather Card */}
        <Animated.View
          style={[
            styles.weatherCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: theme.surface,
            },
          ]}
        >
          {weatherLoading ? (
            <View style={styles.weatherLoadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.weatherLoadingText, { color: theme.textSecondary }]}>
                Loading weather...
              </Text>
            </View>
          ) : weather ? (
            <View style={styles.weatherContent}>
              <View style={styles.weatherLeft}>
                <View style={[styles.weatherIconContainer, { backgroundColor: theme.primary + '15' }]}>
                  {getWeatherIcon(weather.condition, weather.icon)}
                </View>
                <View style={styles.weatherInfo}>
                  <Text style={[styles.weatherTemp, { color: theme.text }]}>
                    {weather.temperature}°C
                  </Text>
                  <Text style={[styles.weatherCondition, { color: theme.textSecondary }]}>
                    {weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
                  </Text>
                </View>
              </View>
              {weather.windSpeed !== undefined && (
                <View style={styles.weatherDetails}>
                  <View style={styles.weatherDetailItem}>
                    <Wind size={16} color={theme.textSecondary} />
                    <Text style={[styles.weatherDetailText, { color: theme.textSecondary }]}>
                      {Math.round(weather.windSpeed * 3.6)} km/h
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </Animated.View>

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
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: theme.surface }]}
            onPress={handleSearchPress}
            activeOpacity={0.7}
          >
            <View style={[styles.searchIconWrapper, { backgroundColor: theme.primary + '15' }]}>
              <Search size={20} color={theme.primary} />
            </View>
            <Text style={[styles.searchText, { color: theme.textSecondary }]}>
              Search routes or operations...
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.featuresSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                onPress={() => router.push(feature.route)}
                theme={theme}
                delay={index * 100}
              />
            ))}
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/Faculty/bus-routes')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? theme.gradientOmbre : ['#3A0CA3', '#2A0A7A', '#1A0A4A']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Bus size={22} color="#FFFFFF" />
              <Text style={styles.ctaText}>View All Routes</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButtonSecondary, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/Faculty/arrival-dashboard')}
            activeOpacity={0.9}
          >
            <BarChart3 size={22} color={theme.primary} />
            <Text style={[styles.ctaTextSecondary, { color: theme.text }]}>View Analytics</Text>
            <ArrowRight size={20} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

interface FeatureCardProps {
  feature: {
    icon: any;
    title: string;
    subtitle: string;
    color: string;
    route: string;
  };
  onPress: () => void;
  theme: any;
  delay: number;
}

const FeatureCard = ({ feature, onPress, theme, delay }: FeatureCardProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor: theme.surface,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.featureTouchable}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
          <feature.icon size={24} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
        <Text style={[styles.featureSubtitle, { color: theme.textSecondary }]}>{feature.subtitle}</Text>
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
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  profileButton: {
    marginLeft: 16,
  },
  profilePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3A0CA3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  statsCardGradient: {
    padding: 24,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  weatherCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 80,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  weatherCondition: {
    fontSize: 14,
    fontWeight: '500',
  },
  weatherDetails: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherDetailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  weatherLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  weatherLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTouchable: {
    alignItems: 'center',
    width: '100%',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  ctaButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3A0CA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  ctaButtonSecondary: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaTextSecondary: {
    fontSize: 17,
    fontWeight: '700',
  },
});
