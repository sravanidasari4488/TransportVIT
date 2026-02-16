import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, StatusBar, Dimensions } from "react-native";
import { MapPin, Clock, Users, X, ArrowLeft } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// VV1-specific data
const routeData = {
   title: "VV5 Bus Route",
    description: "auto nagar gate to ramesh hospital",
    stops: [ "auto nagar gate","high school road"," NTR circle","eenadu","benz circle(bajaj showroom)","DV manor(sweet magic)","ramesh hospital"],
    schedule: [
      { time: "07:35 AM", status: "On Time" },
      { time: "07:37 AM", status: "On Time" },
      { time: "07:40 AM", status: "Delayed by 5m" },
      { time: "07:42 AM", status: "On Time" },
      { time: "07:44 AM", status: "On Time" },
      { time: "07:50 AM", status: "On Time" },
      { time: "07:52 AM", status: "On Time" },
      
    ],
    occupancy: "Medium",
    coordinates: {
      center: [78.4867, 17.3850],
      stops: [
        [78.4867, 17.3850],
        [78.4900, 17.3880],
        [78.4930, 17.3900],
        [78.4960, 17.3920]
      ]
    }
};

export default function VV5Route() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];
  const webViewRef = useRef<any>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  // Mapbox HTML (same as original)
  const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.css' rel='stylesheet' />
    <style>
      body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [${routeData.coordinates.center}],
        zoom: 13
      });

      // Add markers for bus stops
      ${routeData.coordinates.stops.map((coord, i) => `
        new mapboxgl.Marker()
          .setLngLat([${coord}])
          .setPopup(new mapboxgl.Popup().setHTML('<h3>${routeData.stops[i]}</h3>'))
          .addTo(map);
      `).join('')}

      // Current bus location marker (update every 5 seconds)
      let currentMarker = new mapboxgl.Marker({ color: '#3366FF' });
      function updateBusLocation() {
        fetch("https://vit-bus-backend-production.up.railway.app/get_location")
          .then(res => res.json())
          .then(loc => {
            if (loc.lat && loc.lon) {
              currentMarker.setLngLat([loc.lon, loc.lat]).addTo(map);
              map.setCenter([loc.lon, loc.lat]);
            }
          });
      }
      updateBusLocation();
      setInterval(updateBusLocation, 5000);
    </script>
  </body>
  </html>
  `;

  const handleMapResize = () => {
    webViewRef.current?.injectJavaScript('map.resize();');
  };

  const toggleMapExpansion = () => {
    setMapExpanded(!mapExpanded);
    setTimeout(handleMapResize, 300);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Full Screen Map at Top */}
        <View style={styles.mapWrapper}>
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={styles.map}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
            />
            
            {/* Header Overlay */}
            <LinearGradient
              colors={['rgba(58, 12, 163, 0.9)', 'rgba(58, 12, 163, 0.7)', 'transparent']}
              style={styles.mapHeaderOverlay}
            >
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{routeData.title}</Text>
                <Text style={styles.description}>{routeData.description}</Text>
              </View>
            </LinearGradient>
            
            {/* Bottom Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.mapBottomOverlay}
            >
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={toggleMapExpansion}
                activeOpacity={0.8}
              >
                <Text style={styles.expandButtonText}>Tap to expand map</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Bus Stops */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Bus Stops</Text>
          </View>
          <View style={styles.stopsContainer}>
            {routeData.stops.map((stop, i) => (
              <View key={i} style={styles.stopItem}>
                <View style={[styles.stopDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.stopText, { color: theme.text }]}>{stop}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Schedule */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Clock size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Schedule</Text>
          </View>
          <View style={styles.scheduleContainer}>
            {routeData.schedule.map((item, i) => (
              <View key={i} style={styles.scheduleItem}>
                <Text style={[styles.scheduleTime, { color: theme.text }]}>{item.time}</Text>
                <Text style={[
                  styles.scheduleStatus,
                  { color: item.status.includes("Delayed") ? theme.warning : theme.success }
                ]}>
                  {item.status}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Occupancy */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Users size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Current Occupancy</Text>
          </View>
          <View style={styles.occupancyContainer}>
            <View style={[
              styles.occupancyIndicator,
              { backgroundColor: 
                routeData.occupancy === "High" ? theme.error : 
                routeData.occupancy === "Medium" ? theme.warning : theme.success
              }
            ]} />
            <Text style={[styles.occupancyText, { color: theme.text }]}>{routeData.occupancy}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} transparent={false} animationType="fade">
        <View style={[styles.expandedMapContainer, { backgroundColor: theme.background }]}>
          <LinearGradient
            colors={theme.gradientOmbreHeader}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Live Bus Tracking</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={toggleMapExpansion}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.expandedMap}
            onLoad={handleMapResize}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  mapWrapper: {
    height: SCREEN_HEIGHT,
    width: '100%',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  description: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 4,
    opacity: 0.9,
  },
  mapBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  expandButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  expandedMapContainer: {
    flex: 1,
  },
  expandedMap: {
    flex: 1,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  stopsContainer: {
    marginLeft: 8,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  stopText: {
    fontSize: 16,
  },
  scheduleContainer: {
    marginLeft: 8,
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  scheduleTime: {
    fontSize: 16,
  },
  scheduleStatus: {
    fontSize: 16,
    fontWeight: "600",
  },
  occupancyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  occupancyIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  occupancyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
