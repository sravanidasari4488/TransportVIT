import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { MapPin, Clock, Users, X } from "lucide-react-native";
import { WebView } from "react-native-webview";

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

export default function VV1Route() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{routeData.title}</Text>
        <Text style={styles.description}>{routeData.description}</Text>
      </View>

      {/* Map */}
      <TouchableOpacity 
        style={styles.mapContainer} 
        activeOpacity={0.9}
        onPress={toggleMapExpansion}
      >
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
        <View style={styles.mapOverlay}>
          <Text style={styles.mapOverlayText}>Tap to expand</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} transparent={false} animationType="fade">
        <View style={styles.expandedMapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.expandedMap}
            onLoad={handleMapResize}
          />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={toggleMapExpansion}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Bus Stops */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MapPin size={20} color="#3366FF" />
          <Text style={styles.cardTitle}>Bus Stops</Text>
        </View>
        <View style={styles.stopsContainer}>
          {routeData.stops.map((stop, i) => (
            <View key={i} style={styles.stopItem}>
              <View style={styles.stopDot} />
              <Text style={styles.stopText}>{stop}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Clock size={20} color="#3366FF" />
          <Text style={styles.cardTitle}>Schedule</Text>
        </View>
        <View style={styles.scheduleContainer}>
          {routeData.schedule.map((item, i) => (
            <View key={i} style={styles.scheduleItem}>
              <Text style={styles.scheduleTime}>{item.time}</Text>
              <Text style={styles.scheduleStopName}>{item.stopName}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Occupancy */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Users size={20} color="#3366FF" />
          <Text style={styles.cardTitle}>Current Occupancy</Text>
        </View>
        <View style={styles.occupancyContainer}>
          <View style={[
            styles.occupancyIndicator,
            { backgroundColor: 
              routeData.occupancy === "High" ? "#EF4444" : 
              routeData.occupancy === "Medium" ? "#F59E0B" : "#10B981"
            }
          ]} />
          <Text style={styles.occupancyText}>{routeData.occupancy}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Styles (same as original)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },
  description: {
    fontSize: 14,
    color: "#475569",
    marginTop: 4,
  },
  mapContainer: {
    height: 220,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  expandedMapContainer: {
    flex: 1,
  },
  expandedMap: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 24,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
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
    backgroundColor: "#3366FF",
    marginRight: 12,
  },
  stopText: {
    fontSize: 16,
    color: "#334155",
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
    color: "#334155",
  },
  scheduleStopName: {
    fontSize: 14,
    color: "#64748B",
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
    color: "#334155",
    fontWeight: "600",
  },
});
