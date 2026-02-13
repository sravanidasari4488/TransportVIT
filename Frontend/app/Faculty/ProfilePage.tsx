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
  Linking,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Settings, Bell, LogOut, Camera, Globe, Edit, Phone, Mail, MapPin, User, Save, X, Moon, Sun } from 'lucide-react-native';
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
  const { user, logout, uploadProfileImage, updateUserProfile, isLoading } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [contactDetails, setContactDetails] = useState({
    phone: user?.phoneNumber || '',
    department: user?.department || 'Computer Science',
    office: user?.office || 'Block A, Room 101',
  });

  const handleMenuItemPress = async (action: string | undefined) => {
    if (action === 'logout') {
      try {
        await logout();
        router.replace('/login');
      } catch (error) {
        Alert.alert('Logout Failed', 'An error occurred while logging out.');
      }
    } else if (action === 'preferences') {
      // TODO: Add settings page route
      Alert.alert('Settings', 'Settings page coming soon!');
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

  const takePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your camera to take a profile picture.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'An error occurred while taking the photo.');
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const saveContactDetails = async () => {
    try {
      await updateUserProfile({
        displayName: user?.displayName || undefined,
        phoneNumber: contactDetails.phone,
        department: contactDetails.department,
        office: contactDetails.office,
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Contact details updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update contact details.');
    }
  };

  const emailDomain = user?.email ? user.email.split('@')[1] : '';
  const isStudent = emailDomain === 'vitapstudent.ac.in';
  const profileImage = user?.photoURL || 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {uploadingImage ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : (
              <>
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
                <TouchableOpacity style={styles.cameraButton} onPress={showImageOptions}>
                  <Camera size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.name}>{user?.displayName || 'Faculty Member'}</Text>
          <Text style={styles.email}>{user?.email || 'faculty@example.com'}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>Faculty</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => handleMenuItemPress(item.action)}>
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <item.icon size={24} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Contact Information</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Edit size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Dark Mode Toggle */}
        <View style={[styles.themeToggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeToggleContent}>
            <View style={styles.themeInfo}>
              <Text style={[styles.themeTitle, { color: colors.text }]}>Theme</Text>
              <Text style={[styles.themeSubtitle, { color: colors.textSecondary }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.themeToggleButton, { backgroundColor: colors.primary }]} 
              onPress={toggleTheme}
            >
              {isDark ? <Sun size={20} color="#FFFFFF" /> : <Moon size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Mail size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Phone size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contactDetails.phone || 'Not provided'}</Text>
            </View>
          </View>
          

          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Department</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contactDetails.department}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Office</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contactDetails.office}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Edit Contact Details Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Contact Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background, 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  value={contactDetails.phone}
                  onChangeText={(text) => setContactDetails(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              
              
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Department</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background, 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  value={contactDetails.department}
                  onChangeText={(text) => setContactDetails(prev => ({ ...prev, department: text }))}
                  placeholder="Enter department"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Office Location</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background, 
                    color: colors.text, 
                    borderColor: colors.border 
                  }]}
                  value={contactDetails.office}
                  onChangeText={(text) => setContactDetails(prev => ({ ...prev, office: text }))}
                  placeholder="Enter office location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.primary }]} 
                onPress={saveContactDetails}
              >
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

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
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3366FF',
    width: 36,
    height: 36,
    borderRadius: 18,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 4,
  },
  badgeContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badge: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
  },
  infoSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(51, 102, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  themeToggleCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  themeToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeSubtitle: {
    fontSize: 14,
  },
  themeToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ProfilePage;
