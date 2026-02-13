import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Bell, Globe, Moon, Shield, Smartphone } from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';

function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [locationServices, setLocationServices] = React.useState(true);
  const { isDark, toggleTheme } = useTheme();

  const theme = colors[isDark ? 'dark' : 'light'];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: 60,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your app experience</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Bell size={24} color="#3366FF" />
            </View>
            <View>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>Get updates about your bus</Text>
            </View>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: theme.switchTrack, true: theme.switchTrackActive }}
            thumbColor={notifications ? theme.primary : theme.switchThumb}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#374151' : '#FEF3C7' }]}>
              <Moon size={24} color={isDark ? '#F59E0B' : '#F59E0B'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Switch to dark theme</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.switchTrack, true: theme.switchTrackActive }}
            thumbColor={isDark ? theme.primary : theme.switchThumb}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Globe size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.settingTitle}>Location Services</Text>
              <Text style={styles.settingDescription}>Enable location tracking</Text>
            </View>
          </View>
          <Switch
            value={locationServices}
            onValueChange={setLocationServices}
            trackColor={{ false: theme.switchTrack, true: theme.switchTrackActive }}
            thumbColor={locationServices ? theme.primary : theme.switchThumb}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Options</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Shield size={24} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Read our privacy policy</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFE4E6' }]}>
              <Smartphone size={24} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.settingTitle}>About App</Text>
              <Text style={styles.settingDescription}>Version 1.0.0</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default SettingsScreen;
