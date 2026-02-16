import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { MapPin, Clock, Users, X } from "lucide-react-native";
import { WebView } from "react-native-webview";

// VV1-specific data
const routeData = {
  title: "VV3 Bus Route",
    description: "kamayyathopu center to screw bridge",
    stops: ["kamayyathopu center", "pappula mill center", "ashok nagar", "time hospital","auto nagar gate","screw bridge"],
    schedule: [
      { time: "07:40 AM", status: "On Time" },
      { time: "07:42 AM", status: "On Time" },
      { time: "07:45 AM", status: "Delayed by 5m" },
      { time: "07:47 AM", status: "On Time" },
      { time: "07:48 AM", status: "On Time" },
      { time: "07:58 AM", status: "On Time" },
      
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

export default function VV1Route() {
  const webViewRef = useRef(null);
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
      mapboxgl.accessToken = 'pk.eyJ1IjoiZ25hbmFzYWkxMjMiLCJhIjoiY204Mzh4NmphMGdhNDJscXZmd2pnb3ZrOCJ9.Cp-WLG0aK9wVlbTEUBaItA';
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
        fetch("https://git-backend-1-production.up.railway.app/get_location")
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
              <Text style={[
                styles.scheduleStatus,
                item.status.includes("Delayed") ? styles.delayed : styles.onTime
              ]}>
                {item.status}
              </Text>
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
  scheduleStatus: {
    fontSize: 16,
    fontWeight: "600",
  },
  onTime: {
    color: "#10B981",
  },
  delayed: {
    color: "#F59E0B",
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
    fontWeight: "600",
  },
});