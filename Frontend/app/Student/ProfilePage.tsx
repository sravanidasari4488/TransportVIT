import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  Lock, 
  Settings, 
  Camera, 
  ArrowRight, 
  FileText, 
  HelpCircle, 
  LogOut, 
  Info,
  Globe
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../(auth)/context/AuthProvider';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';

function ProfilePage() {
  const { user, logout, uploadProfileImage, isLoading, selectedRouteId } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setUploadingImage(true);
        try {
          await uploadProfileImage(result.assets[0].uri);
          Alert.alert('Success', 'Profile picture updated successfully!');
        } catch (error: any) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Failed', `Failed to upload profile picture: ${error.message || 'Unknown error'}`);
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'An error occurred while selecting the image.');
      setUploadingImage(false);
    }
  };

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

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Logout Failed', 'An error occurred while logging out.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://vitap.ac.in/privacy-policy');
  };

  const handleVTOP = () => {
    Linking.openURL('https://vtop.vitap.ac.in/vtop/open/page');
  };

  const handleAbout = () => {
    Alert.alert(
      'About',
      'VIT-AP Bus Tracker\nVersion 1.0.0\n\nTrack your bus in real-time and never miss your ride!',
      [{ text: 'OK' }]
    );
  };

  const profileImage = user?.photoURL;
  const theme = colors[isDark ? 'dark' : 'light'];
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account</Text>
          
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
                <>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <View style={[styles.initialsContainer, { backgroundColor: theme.primary }]}>
                      <Text style={styles.initialsText}>
                        {getInitials(user?.displayName, user?.email)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.cameraIconContainer, { backgroundColor: theme.surface }]}>
                    <Camera size={14} color={theme.primary} />
                  </View>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.name, { color: theme.text }]}>{displayName.toUpperCase()}</Text>
          </View>
        </Animated.View>

        {/* Account Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Account</Text>
          
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MenuItem
              icon={User}
              label="Profile"
              onPress={() => {
                router.push('/Student/profile');
              }}
              theme={theme}
            />
            <MenuItem
              icon={Lock}
              label="Manage Credentials"
              onPress={() => {
                Alert.alert('Manage Credentials', 'This feature will be available soon.');
              }}
              theme={theme}
            />
            <MenuItem
              icon={Globe}
              label="VTOP"
              onPress={handleVTOP}
              theme={theme}
            />
            <MenuItem
              icon={Settings}
              label="Settings"
              onPress={() => router.push('/Student/settings')}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Settings Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MenuItem
              icon={FileText}
              label="Privacy policy"
              onPress={handlePrivacyPolicy}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Actions Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Actions</Text>
          
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.logoutIcon, { backgroundColor: '#EF4444' + '20' }]}>
                <LogOut size={20} color="#EF4444" />
              </View>
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={handleAbout}
              activeOpacity={0.7}
            >
              <View style={[styles.aboutIcon, { backgroundColor: theme.primary + '20' }]}>
                <Info size={20} color={theme.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.text }]}>About</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

interface MenuItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  theme: any;
  showHelp?: boolean;
}

const MenuItem = ({ icon: Icon, label, onPress, theme, showHelp }: MenuItemProps) => {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: theme.primary + '15' }]}>
          <Icon size={20} color={theme.primary} />
        </View>
        <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
        {showHelp && (
          <View style={[styles.helpCircle, { backgroundColor: theme.primary + '20' }]}>
            <HelpCircle size={12} color={theme.primary} />
          </View>
        )}
      </View>
      <ArrowRight size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#E5E5E5',
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E5E5',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  helpCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfilePage;
