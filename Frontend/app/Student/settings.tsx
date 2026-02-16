import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Animated, Alert, Linking } from 'react-native';
import { Bell, Globe, Moon, Shield, Smartphone, ArrowLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';

function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [locationServices, setLocationServices] = React.useState(true);
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  }, []);

  const theme = colors[isDark ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonContainer}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your experience</Text>
          </View>
          <View style={styles.placeholder} />
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
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
            <Sparkles size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
          </View>

          <SettingItem
            icon={Bell}
            title="Notifications"
            description="Get updates about your bus"
            value={notifications}
            onValueChange={setNotifications}
            color="#FF6B35"
            gradient={['#FF6B35', '#F7931E']}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
          />

          <SettingItem
            icon={Moon}
            title="Dark Mode"
            description="Switch to dark theme"
            value={isDark}
            onValueChange={toggleTheme}
            color="#9C27B0"
            gradient={['#9C27B0', '#7B1FA2']}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
          />

          <SettingItem
            icon={Globe}
            title="Location Services"
            description="Enable location tracking"
            value={locationServices}
            onValueChange={setLocationServices}
            color="#00D4AA"
            gradient={['#00D4AA', '#00B894']}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
          />
        </Animated.View>

        {/* More Options Section */}
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
            <Sparkles size={20} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>More Options</Text>
          </View>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://vitap.ac.in/privacy-policy')}
          >
            <View style={[styles.actionCardGradient, { backgroundColor: theme.surface }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Shield size={24} color="#8B5CF6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Privacy Policy</Text>
                <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>Read our privacy policy</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => Alert.alert('About', 'VIT-AP Bus Tracker\nVersion 1.0.0')}
          >
            <View style={[styles.actionCardGradient, { backgroundColor: theme.surface }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#EF4444' + '20' }]}>
                <Smartphone size={24} color="#EF4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>About App</Text>
                <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>Version 1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

interface SettingItemProps {
  icon: any;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  color: string;
  gradient: string[];
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const SettingItem = ({ icon: Icon, title, description, value, onValueChange, color, gradient, fadeAnim, slideAnim }: SettingItemProps) => {
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];

  return (
    <Animated.View
      style={[
        styles.settingItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[styles.settingItemGradient, { backgroundColor: theme.surface }]}
      >
        <View style={styles.settingLeft}>
          <LinearGradient
            colors={gradient}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E5E5E5', true: color + '80' }}
          thumbColor={value ? color : '#FFFFFF'}
          ios_backgroundColor="#E5E5E5"
        />
      </View>
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
    width: 44,
    height: 44,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  settingItem: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  settingItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  actionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SettingsScreen;
