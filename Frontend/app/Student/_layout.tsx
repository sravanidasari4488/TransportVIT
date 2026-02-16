import { Tabs } from 'expo-router';
import { Bus, Map, User, Clock, Home } from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function TabLayout() {
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
          borderTopColor: isDark ? '#1A1A1A' : '#E9D5FF',
          borderTopWidth: 1,
          height: 75,
          paddingBottom: 12,
          paddingTop: 12,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        headerShown: false,
        tabBarBackground: () => {
          const theme = colors[isDark ? 'dark' : 'light'];
          const gradientColors = isDark 
            ? (theme.gradientOmbre as unknown as readonly [string, string, ...string[]])
            : ['#FFFFFF', '#F5F3FF', '#E9D5FF'] as const;
          return (
            <LinearGradient
              colors={gradientColors}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          );
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: theme.primary + '20' }
            ]}>
              <Home 
                size={focused ? 24 : 22} 
                color={focused ? theme.primary : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bus-routes"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: theme.primary + '20' }
            ]}>
              <Map 
                size={focused ? 24 : 22} 
                color={focused ? theme.primary : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="arrivals"
        options={{
          title: 'Arrivals',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: theme.primary + '20' }
            ]}>
              <Clock 
                size={focused ? 24 : 22} 
                color={focused ? theme.primary : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ProfilePage"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: theme.primary + '20' }
            ]}>
              <User 
                size={focused ? 24 : 22} 
                color={focused ? theme.primary : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});

export default TabLayout;
