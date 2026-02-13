import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bus, MapPin } from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';

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

  const handleBackPress = () => {
    router.back();
  };

  const handleRoutePress = (routeId: string) => {
    router.push(`/routes/${routeId}`);
  };

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1E293B' : '#FFFFFF'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ArrowLeft size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Bus Route</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {busRoutes.map((citySection, cityIndex) => (
          <View key={cityIndex} style={styles.citySection}>
            <Text style={styles.cityTitle}>{citySection.city} Routes</Text>
            <View style={styles.routesGrid}>
              {citySection.routes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeButton}
                  onPress={() => handleRoutePress(route.id)}
                >
                  <View style={styles.routeHeader}>
                    <Bus size={20} color={isDark ? '#3B82F6' : '#1D4ED8'} />
                    <Text style={styles.routeName}>{route.name}</Text>
                  </View>
                  <View style={styles.routeDetails}>
                    <View style={styles.routePoint}>
                      <MapPin size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={styles.routeText} numberOfLines={1}>{route.from}</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routePoint}>
                      <MapPin size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={styles.routeText} numberOfLines={1}>{route.to}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  citySection: {
    marginBottom: 32,
  },
  cityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 16,
  },
  routesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  routeButton: {
    width: '48%',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginLeft: 8,
  },
  routeDetails: {
    flex: 1,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    fontSize: 14,
    color: isDark ? '#CBD5E1' : '#374151',
    marginLeft: 6,
    flex: 1,
  },
  routeDivider: {
    width: 2,
    height: 16,
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    marginLeft: 7,
    marginVertical: 4,
  },
});

