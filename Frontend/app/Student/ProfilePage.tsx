import React, { useState } from 'react';
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
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Settings, Bell, LogOut, Camera, Globe } from 'lucide-react-native';
import { useAuth } from '../(auth)/context/AuthProvider';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useRouter } from 'expo-router';

const menuItems = [
  { icon: Bell, label: 'Notifications', color: '#F59E0B' },
  { icon: Settings, label: 'Preferences', color: '#10B981', action: 'preferences' },
  { icon: Globe, label: 'VTOP', color: '#3B82F6', action: 'vtop' },
  { icon: LogOut, label: 'Logout', color: '#EF4444', action: 'logout' },
];

function ProfilePage() {
  const { user, logout, uploadProfileImage, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleMenuItemPress = async (action: string | undefined) => {
    if (action === 'logout') {
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
    } else if (action === 'preferences') {
      router.push('/settings'); 
    } else if (action === 'vtop') {
      Linking.openURL('https://vtop.vitap.ac.in/vtop/open/page');
    }
  };

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
          console.log("Attempting to upload image:", result.assets[0].uri);
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

  // Helper function to get initials like Gmail
  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      const names = name.trim().split(' ');
      if (names.length === 1) return names[0][0].toUpperCase();
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U'; // fallback
  };

  const emailDomain = user?.email ? user.email.split('@')[1] : '';
  const isStudent = emailDomain === 'vitapstudent.ac.in';
  const profileImage = user?.photoURL;

  const styles = getStyles(isDark);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {uploadingImage ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : (
              <>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.initialsContainer}>
                    <Text style={styles.initialsText}>
                      {getInitials(user?.displayName, user?.email)}
                    </Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.cameraButton}
                  onPress={pickImage}
                >
                  <Camera size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.name}>{user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>{isStudent ? 'Student' : 'Faculty'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>VV1</Text>
          <Text style={styles.statLabel}>Route</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(item.action)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <item.icon size={24} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Account Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>User Type</Text>
          <Text style={styles.infoValue}>{isStudent ? 'Student' : 'Faculty'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
  },
  header: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderWidth: 4,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: isDark ? '#475569' : '#CBD5E1',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDark ? '#1E293B' : '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: isDark ? '#94A3B8' : '#64748B',
    marginBottom: 12,
  },
  badgeContainer: {
    backgroundColor: isDark ? '#334155' : '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badge: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#0369A1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  statLabel: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 4,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  infoSection: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  infoLabel: {
    fontSize: 16,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
});

export default ProfilePage;
