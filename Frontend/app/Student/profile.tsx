import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Mail, Bus } from 'lucide-react-native';
import { useAuth } from '../(auth)/context/AuthProvider';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';

function ProfileDetailsPage() {
  const router = useRouter();
  const { user, selectedRouteId } = useAuth();
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];

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

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      const names = name.trim().split(' ');
      if (names.length === 1) return names[0][0].toUpperCase();
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const profileImage = user?.photoURL;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const email = user?.email || 'No email';
  const busRoute = selectedRouteId || 'Not selected';

  const getUserPhoto = () => {
    if (profileImage) return profileImage;
    const initials = getInitials(user?.displayName, user?.email);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3A0CA3&color=fff&bold=true`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <LinearGradient
        colors={theme.gradientOmbreHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.initialsContainer, { backgroundColor: theme.primary }]}>
                <Text style={styles.initialsText}>
                  {getInitials(user?.displayName, user?.email)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Details Card */}
        <Animated.View
          style={[
            styles.detailsCard,
            {
              backgroundColor: theme.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Name */}
          <View style={styles.detailItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <User size={20} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Name</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{displayName}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Email */}
          <View style={styles.detailItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Mail size={20} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{email}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Bus Route */}
          <View style={styles.detailItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Bus size={20} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Bus Route</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {busRoute === 'Not selected' ? busRoute : busRoute.toUpperCase()}
              </Text>
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  initialsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginLeft: 60,
  },
});

export default ProfileDetailsPage;

