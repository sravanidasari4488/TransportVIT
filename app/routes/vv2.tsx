import React, { useRef, useState } from "react";
import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { MapPin, Clock, Users, X } from "lucide-react-native";
import { WebView } from "react-native-webview";

// VV1-specific data
const routeData = {
  title: "VV2 Bus Route",
    description: "poranki center to time hospital",
    stops: ["poranki center", "thumu center", "tadigadapa", "KCP colony","VR siddartha","bharath petrol pump","kamayyathopu","time hospital"],
    schedule: [
      { time: "07:40 AM", status: "On Time" },
      { time: "07:43 AM", status: "On Time" },
      { time: "07:45 AM", status: "Delayed by 5m" },
      { time: "07:48 AM", status: "On Time" },
      { time: "07:50 AM", status: "On Time" },
      { time: "07:52 AM", status: "On Time" },
      { time: "07:55 AM", status: "On Time" },
      { time: "08:00 AM", status: "On Time" },
    ],
    occupancy: "Medium",
    stopsCoordinates: [
      { name: "Poranki center", lat: 16.5032, lng: 80.6310 },
      { name: "Thumu center", lat: 16.5045, lng: 80.6325 },
      { name: "Tadigadapa", lat: 16.5058, lng: 80.6340 },
      { name: "KCP colony", lat: 16.5071, lng: 80.6355 },
      { name: "VR Siddartha", lat: 16.5084, lng: 80.6370 },
      { name: "Bharath petrol pump", lat: 16.5097, lng: 80.6385 },
      { name: "Kamayyathopu", lat: 16.5110, lng: 80.6400 },
      { name: "Time hospital", lat: 16.5123, lng: 80.6415 }
    ]
};

// Utility function to calculate distance in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to send arrival data to backend
const sendArrivalData = async (routeId: string, stopName: string, actualTime: string) => {
  try {
    await fetch('https://git-backend-1-production.up.railway.app/api/arrivals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routeId,
        stopName,
        actualTime,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Error sending arrival data:', error);
  }
};

export default function VV1Route() {
  const webViewRef = useRef(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [stopArrivalTimes, setStopArrivalTimes] = useState<{ [key: string]: string }>({});

  // Track bus location and record arrival times
  useEffect(() => {
    const fetchLiveLocation = async () => {
      try {
        const res = await fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-13");
        const data = await res.json();
        if (!data?.lat || !data?.lon) return;

        const busLat = parseFloat(data.lat);
        const busLon = parseFloat(data.lon);

        routeData.stopsCoordinates.forEach((stop) => {
          const distance = getDistanceFromLatLonInMeters(busLat, busLon, stop.lat, stop.lng);
          if (distance < 50 && !stopArrivalTimes[stop.name]) {
            const now = new Date();
            const hr = now.getHours();
            const min = now.getMinutes().toString().padStart(2, '0');
            const ampm = hr >= 12 ? "PM" : "AM";
            const hr12 = hr % 12 || 12;
            const time = `${hr12}:${min} ${ampm}`;

            setStopArrivalTimes((prev) => ({ ...prev, [stop.name]: time }));
            
            // Send arrival data to backend for faculty dashboard
            sendArrivalData('vv2', stop.name, time);
          }
        });
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    };

    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 10000);
    return () => clearInterval(interval);
  }, [stopArrivalTimes]);

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
        center: [${routeData.stopsCoordinates[0].lng}, ${routeData.stopsCoordinates[0].lat}],
        zoom: 13
      });

      // Add markers for bus stops
      ${routeData.stopsCoordinates.map((coord, i) => `
        new mapboxgl.Marker()
          .setLngLat([${coord.lng}, ${coord.lat}])
          .setPopup(new mapboxgl.Popup().setHTML('<h3>${routeData.stops[i]}</h3>'))
          .addTo(map);
      `).join('')}

      // Current bus location marker (update every 5 seconds)
      let currentMarker = new mapboxgl.Marker({ color: '#3366FF' });
      function updateBusLocation() {
        fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-13")
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
              <Text style={styles.scheduleStop}>{item.stopName || routeData.stops[i]}</Text>
              <Text style={styles.scheduleActualTime}>
                {stopArrivalTimes[item.stopName || routeData.stops[i]] || "-"}
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
    width: "30%",
  },
  scheduleStop: {
    fontSize: 16,
    color: "#334155",
    width: "40%",
  },
  scheduleActualTime: {
    fontSize: 16,
    color: "#334155",
    width: "30%",
    textAlign: "right",
    fontWeight: "bold",
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