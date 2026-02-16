import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from "react-native";
import { MapPin, Clock, Users, X, Navigation, Zap, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from 'expo-linear-gradient';

// VV1-specific data
const routeData = {
  title: "VV1 Express",
  description: "Kankipadu ↔ Poranki",
  stops: ["Kankipadu", "Gosala", "Edupugallu", "Penumaluru", "Poranki"],
  schedule: [
    { time: "07:25 AM", stopName: "Kankipadu" },
    { time: "07:30 AM", stopName: "Gosala" },
    { time: "07:32 AM", stopName: "Edupugallu" },
    { time: "07:40 AM", stopName: "Penumaluru" },
    { time: "07:45 AM", stopName: "Poranki" },
  ],
  occupancy: "Medium",
  busNumber: "VV-12",
  stopsCoordinates: [
    { name: "Kankipadu", lat: 16.52746, lng: 80.628769 },
    { name: "Gosala", lat: 16.5292, lng: 80.6310 },
    { name: "Edupugallu", lat: 16.5282, lng: 80.6292 },
    { name: "Penumaluru", lat: 16.5120, lng: 80.6204 },
    { name: "Poranki", lat: 16.5032, lng: 80.6310 }
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
  const [currentStop, setCurrentStop] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<any[]>([]);
  const [stopArrivalTimes, setStopArrivalTimes] = useState<{ [key: string]: string }>({});
  const [isLive, setIsLive] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Determine current stop
  useEffect(() => {
    const fetchCurrentStop = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const hours12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const time = `${hours12}:${minutes} ${ampm}`;

      let foundStop = null;
      for (let i = 0; i < routeData.schedule.length; i++) {
        const stopTime = routeData.schedule[i].time;
        const [time, period] = stopTime.split(' ');
        const [stopHours, stopMinutes] = time.split(':').map(Number);
        const stopHours24 = period === 'PM' && stopHours !== 12 ? stopHours + 12 : stopHours;

        if (hours < stopHours24 || (hours === stopHours24 && minutes < stopMinutes)) {
          foundStop = routeData.schedule[i].stopName;
          break;
        }
      }

      setCurrentStop(foundStop || "Completed");

      const updatedSchedule = routeData.schedule.map(item => {
        const isReached = currentStop && routeData.stops.indexOf(item.stopName) < routeData.stops.indexOf(currentStop);
        const isCurrent = item.stopName === currentStop;

        return {
          ...item,
          status: isCurrent ? "Arriving" : isReached ? "Reached" : "Pending"
        };
      });

      setScheduleStatus(updatedSchedule);
    };

    fetchCurrentStop();
    const interval = setInterval(fetchCurrentStop, 60000);
    return () => clearInterval(interval);
  }, [currentStop]);

  // Track bus location and record arrival times
  useEffect(() => {
    const fetchLiveLocation = async () => {
      try {
        const res = await fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-12");
        const data = await res.json();
        if (!data?.lat || !data?.lon) {
          setIsLive(false);
          return;
        }

        setIsLive(true);
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
            sendArrivalData('vv1', stop.name, time);
          }
        });
      } catch (err) {
        console.error("Error fetching location:", err);
        setIsLive(false);
      }
    };

    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 10000);
    return () => clearInterval(interval);
  }, [stopArrivalTimes]);

  const mapHtml = `<!DOCTYPE html>
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
        fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-12")
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
  </html>`;

  const handleMapResize = () => {
    webViewRef.current?.injectJavaScript('map.resize();');
  };

  const toggleMapExpansion = () => {
    setMapExpanded(!mapExpanded);
    setTimeout(handleMapResize, 300);
  };

  const getStopStatus = (stopName: string, index: number) => {
    if (stopArrivalTimes[stopName]) return 'completed';
    if (currentStop === stopName) return 'current';
    if (currentStop && routeData.stops.indexOf(stopName) < routeData.stops.indexOf(currentStop)) return 'completed';
    return 'pending';
  };

  const getOccupancyColor = (occupancy: string) => {
    switch (occupancy) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.heroHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.routeNumber}>{routeData.title}</Text>
            <Text style={styles.routeDescription}>{routeData.description}</Text>
          </View>
          
          <View style={styles.statusSection}>
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
            </View>
            <Text style={styles.busNumber}>Bus {routeData.busNumber}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Navigation size={24} color="#667eea" />
          <Text style={styles.statNumber}>{routeData.stops.length}</Text>
          <Text style={styles.statLabel}>Total Stops</Text>
        </View>
        
        <View style={styles.statCard}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={styles.statNumber}>{Object.keys(stopArrivalTimes).length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        
        <View style={styles.statCard}>
          <Users size={24} color={getOccupancyColor(routeData.occupancy)} />
          <Text style={[styles.statNumber, { color: getOccupancyColor(routeData.occupancy) }]}>
            {routeData.occupancy}
          </Text>
          <Text style={styles.statLabel}>Occupancy</Text>
        </View>
      </View>

      {/* Interactive Map */}
      <View style={styles.mapSection}>
        <View style={styles.sectionHeader}>
          <MapPin size={20} color="#667eea" />
          <Text style={styles.sectionTitle}>Live Tracking</Text>
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.expandButton} onPress={toggleMapExpansion}>
              <Text style={styles.expandButtonText}>Expand</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity style={styles.mapContainer} activeOpacity={0.9} onPress={toggleMapExpansion}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)']}
            style={styles.mapGradientOverlay}
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} transparent={false} animationType="slide">
        <View style={styles.expandedMapContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Live Bus Tracking</Text>
            <TouchableOpacity style={styles.closeButton} onPress={toggleMapExpansion}>
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

      {/* Route Progress */}
      <View style={styles.progressSection}>
        <View style={styles.sectionHeader}>
          <Zap size={20} color="#667eea" />
          <Text style={styles.sectionTitle}>Route Progress</Text>
        </View>
        
        <View style={styles.progressContainer}>
          {routeData.stops.map((stop, index) => {
            const status = getStopStatus(stop, index);
            const isLast = index === routeData.stops.length - 1;
            
            return (
              <View key={index} style={styles.progressItem}>
                <View style={styles.progressLeft}>
                  <View style={[
                    styles.progressDot,
                    status === 'completed' && styles.completedDot,
                    status === 'current' && styles.currentDot,
                    status === 'pending' && styles.pendingDot
                  ]}>
                    {status === 'completed' && <CheckCircle size={16} color="#FFFFFF" />}
                    {status === 'current' && <AlertCircle size={16} color="#FFFFFF" />}
                    {status === 'pending' && <Text style={styles.dotNumber}>{index + 1}</Text>}
                  </View>
                  {!isLast && <View style={[
                    styles.progressLine,
                    status === 'completed' && styles.completedLine
                  ]} />}
                </View>
                
                <View style={styles.progressContent}>
                  <Text style={[
                    styles.stopName,
                    status === 'current' && styles.currentStopName
                  ]}>
                    {stop}
                  </Text>
                  <Text style={styles.stopTime}>
                    Scheduled: {routeData.schedule[index]?.time}
                  </Text>
                  {stopArrivalTimes[stop] && (
                    <Text style={styles.actualTime}>
                      Arrived: {stopArrivalTimes[stop]}
                    </Text>
                  )}
                  {status === 'current' && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Approaching</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Schedule Table */}
      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeader}>
          <Clock size={20} color="#667eea" />
          <Text style={styles.sectionTitle}>Detailed Schedule</Text>
        </View>
        
        <View style={styles.scheduleTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Stop</Text>
            <Text style={styles.tableHeaderText}>Scheduled</Text>
            <Text style={styles.tableHeaderText}>Actual</Text>
          </View>
          
          {routeData.schedule.map((item, index) => (
            <View key={index} style={[
              styles.tableRow,
              stopArrivalTimes[item.stopName] && styles.completedRow
            ]}>
              <Text style={styles.tableCellStop}>{item.stopName}</Text>
              <Text style={styles.tableCell}>{item.time}</Text>
              <Text style={[
                styles.tableCell,
                stopArrivalTimes[item.stopName] && styles.actualTimeCell
              ]}>
                {stopArrivalTimes[item.stopName] || '-'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  titleSection: {
    flex: 1,
  },
  routeNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  busNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  mapSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  mapControls: {
    flexDirection: 'row',
  },
  expandButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  mapGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  expandedMapContainer: {
    flex: 1,
    backgroundColor: '#000',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  expandedMap: {
    flex: 1,
  },
  progressSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  progressItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  progressLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  completedDot: {
    backgroundColor: '#10B981',
  },
  currentDot: {
    backgroundColor: '#F59E0B',
  },
  pendingDot: {
    backgroundColor: '#E5E7EB',
  },
  dotNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  progressLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  progressContent: {
    flex: 1,
    paddingTop: 4,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  currentStopName: {
    color: '#F59E0B',
  },
  stopTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  actualTime: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  scheduleSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  scheduleTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  completedRow: {
    backgroundColor: '#F0FDF4',
  },
  tableCellStop: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  actualTimeCell: {
    color: '#10B981',
    fontWeight: '600',
  },
});