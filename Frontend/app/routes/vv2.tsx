import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, StatusBar, Dimensions } from "react-native";
import { MapPin, Clock, Users, X, ArrowLeft } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// VV2-specific data
const routeData = {
  title: "VV2 Bus Route",
  description: "Poranki Center ↔ Time Hospital",
  stops: ["Poranki Center", "Thumu Center", "Tadigadapa", "KCP Colony", "VR Siddartha", "Bharath Petrol Pump", "Kamayyathopu", "Time Hospital"],
  schedule: [
    { time: "07:40 AM", stopName: "Poranki Center" },
    { time: "07:43 AM", stopName: "Thumu Center" },
    { time: "07:45 AM", stopName: "Tadigadapa" },
    { time: "07:48 AM", stopName: "KCP Colony" },
    { time: "07:50 AM", stopName: "VR Siddartha" },
    { time: "07:52 AM", stopName: "Bharath Petrol Pump" },
    { time: "07:55 AM", stopName: "Kamayyathopu" },
    { time: "08:00 AM", stopName: "Time Hospital" },
  ],
  occupancy: "Medium",
  busNumber: "VV-11",
  stopsCoordinates: [
    { name: "Poranki Center", lat: 16.5032, lng: 80.6310 },
    { name: "Thumu Center", lat: 16.5050, lng: 80.6330 },
    { name: "Tadigadapa", lat: 16.5070, lng: 80.6350 },
    { name: "KCP Colony", lat: 16.5090, lng: 80.6370 },
    { name: "VR Siddartha", lat: 16.5110, lng: 80.6390 },
    { name: "Bharath Petrol Pump", lat: 16.5130, lng: 80.6410 },
    { name: "Kamayyathopu", lat: 16.5150, lng: 80.6430 },
    { name: "Time Hospital", lat: 16.5170, lng: 80.6450 }
  ]
};

export default function VV2Route() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];
  const webViewRef = useRef<any>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  // OpenStreetMap HTML for VV2
  const mapHtml = `
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Route VV-11 Tracker</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body {
            font-family: Arial;
            margin: 0;
            padding: 0;
        }

        #map {
            height: 100vh;
            width: 100%;
        }
    </style>
  </head>

  <body>
    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        let map, marker;
        const vv2Stops = ${JSON.stringify(routeData.stopsCoordinates)};

        function initMap() {
            map = L.map('map').setView([16.5050, 80.6330], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add stop markers
            vv2Stops.forEach(stop => {
                L.marker([stop.lat, stop.lng])
                    .bindPopup(\`<b>\${stop.name}</b>\`)
                    .addTo(map);
            });

            // Draw route line
            const routeCoords = vv2Stops.map(stop => [stop.lat, stop.lng]);
            L.polyline(routeCoords, { color: '#8B5CF6', weight: 4, opacity: 0.7 }).addTo(map);

            // Create bus marker
            const busIcon = L.divIcon({
                html: '🚌',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            marker = L.marker([16.5050, 80.6330], { icon: busIcon }).addTo(map);

            updateLiveLocation();
            setInterval(updateLiveLocation, 5000);
        }

        async function updateLiveLocation() {
            try {
                const res = await fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-11");
                const data = await res.json();
                if (data && data.lat && data.lon) {
                    const position = [parseFloat(data.lat), parseFloat(data.lon)];
                    marker.setLatLng(position);
                    map.setView(position, 13);
                }
            } catch (err) {
                console.error("Error fetching VV-11 live location:", err);
            }
        }

        window.onload = initMap;
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
                <Text style={[styles.scheduleStopName, { color: theme.textSecondary }]}>{item.stopName}</Text>
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
  expandedMapContainer: {
    flex: 1,
  },
  expandedMap: {
    flex: 1,
  },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 20,
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
  scheduleStopName: {
    fontSize: 14,
    fontWeight: "500",
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