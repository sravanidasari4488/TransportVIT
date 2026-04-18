import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Dimensions, StatusBar } from "react-native";
import { Users, X, Navigation, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ArrowLeft, Bus, Activity, TrendingUp } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import arrivalService from '../../src/services/arrivalService';
import { API_CONFIG } from '../config/api';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';
import type { BusRouteConfig } from './busRouteTypes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function BusRouteScreen({ routeId, gpsBusId, routeData }: BusRouteConfig) {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = colors[isDark ? 'dark' : 'light'];
  const webViewRef = useRef<WebView>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [currentStop, setCurrentStop] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<any[]>([]);
  const [stopArrivalTimes, setStopArrivalTimes] = useState<{ [key: string]: string }>({});
  const [stopArrivalTimestamps, setStopArrivalTimestamps] = useState<{ [key: string]: number }>({});
  const [isLive, setIsLive] = useState(false);
  const [todayArrivals, setTodayArrivals] = useState<any[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const specificStops = routeData.stopsCoordinates;

  const sendArrivalData = useCallback(
    async (stopName: string, actualTime: string, lat?: number, lng?: number, timestamp?: string) => {
      try {
        const scheduleItem = routeData.schedule.find((item) => item.stopName === stopName);
        let scheduledTime = scheduleItem?.time || "";

        if (!scheduledTime) {
          const now = new Date();
          const hr = now.getHours();
          const min = now.getMinutes().toString().padStart(2, "0");
          const ampm = hr >= 12 ? "PM" : "AM";
          const hr12 = hr % 12 || 12;
          scheduledTime = `${hr12}:${min} ${ampm}`;
        }

        let stopCoordinates =
          lat && lng ? { lat, lng } : routeData.stopsCoordinates.find((stop) => stop.name === stopName);

        if (!lat || !lng) {
          if (!stopCoordinates) {
            console.error("No coordinates found for stop:", stopName);
            return;
          }
        }

        const arrivalData = {
          routeId: routeId.toLowerCase(),
          busNumber: routeData.busNumber,
          stopName: stopName,
          scheduledTime: scheduledTime,
          actualTime: actualTime,
          arrivalTimestamp: new Date().toISOString(),
          location: {
            lat: lat || stopCoordinates?.lat || 0,
            lng: lng || stopCoordinates?.lng || 0,
          },
          occupancy: routeData.occupancy.toLowerCase(),
          passengerCount: 0,
          driverNotes: "",
          weather: "clear",
          trafficCondition: "moderate",
          status: "on_time",
        };

        const endpoint = `${API_CONFIG.BASE_URL}/api/arrivals`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(arrivalData),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("✅ Arrival data saved successfully!");
        } else if (response.status === 409) {
          try {
            const updateResponse = await fetch(
              `${API_CONFIG.BASE_URL}/api/arrivals/${routeId.toLowerCase()}/${encodeURIComponent(stopName)}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(arrivalData),
              }
            );
            if (updateResponse.ok) {
              console.log("✅ Arrival data updated successfully!");
            }
          } catch {
            /* ignore */
          }
        } else {
          console.error("❌ Failed to save arrival data. Status:", response.status);
        }
      } catch (error) {
        console.error("Error sending arrival data:", error);
      }
    },
    [routeId, routeData]
  );

  // Initial animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse animation for live indicator - only when tracker is live
  useEffect(() => {
    if (!isLive) {
      // Reset to 1 when offline (no pulse)
      pulseAnim.setValue(1);
      return;
    }
    
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
  }, [isLive]);

  // Function to find nearest GPS coordinate from server for a stop
  const findNearestGpsForStop = async (stopName: string, stopLat: number, stopLng: number): Promise<{ timestamp: string; distance: number } | null> => {
    try {
      const gpsRouteId = gpsBusId;
      
      // Fetch recent GPS locations - try multiple approaches
      let gpsLocations: any[] = [];
      
      // Approach 1: Try to get route history (if endpoint exists)
      try {
        const historyRes = await fetch(`https://git-backend-1-production.up.railway.app/api/stops/route/${gpsRouteId}/history`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData)) {
            gpsLocations = historyData;
          }
        }
      } catch (e) {
        // Endpoint might not exist, continue
      }
      
      // Approach 2: Get latest location and use it if it's near
      try {
        const latestRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${gpsRouteId}`);
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData && (latestData.latitude || latestData.lat)) {
            const lat = latestData.latitude || latestData.lat;
            const lng = latestData.longitude || latestData.lon;
            const distance = getDistanceFromLatLonInMeters(stopLat, stopLng, lat, lng);
            // If within 200 meters, consider it
            if (distance < 200 && latestData.timestamp) {
              return {
                timestamp: latestData.timestamp,
                distance: distance
              };
            }
          }
        }
      } catch (e) {
        console.error('Error fetching latest GPS:', e);
      }
      
      // If we have GPS locations from history, find nearest
      if (gpsLocations.length > 0) {
        let nearest: any = null;
        let minDistance = Infinity;
        
        gpsLocations.forEach((gps: any) => {
          const gpsLat = gps.lat || gps.latitude;
          const gpsLng = gps.lon || gps.longitude;
          if (gpsLat && gpsLng && gps.timestamp) {
            const distance = getDistanceFromLatLonInMeters(stopLat, stopLng, gpsLat, gpsLng);
            if (distance < minDistance && distance < 200) { // Within 200 meters
              minDistance = distance;
              nearest = { timestamp: gps.timestamp, distance: distance };
            }
          }
        });
        
        if (nearest) {
          return nearest;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding nearest GPS for ${stopName}:`, error);
      return null;
    }
  };

  // Fetch today's arrivals - only when tracker is live
  useEffect(() => {
    if (!isLive) {
      // Clear arrival times when tracker is off
      setStopArrivalTimes({});
      setStopArrivalTimestamps({});
      setTodayArrivals([]);
      return;
    }

    const fetchTodayArrivals = async () => {
      try {
        console.log(`🔄 Fetching today's arrivals for ${routeId}...`);
        const response = await arrivalService.getTodayArrivals(routeId);
        console.log('📥 Today\'s arrivals response:', response);
        
        if (response.success && response.data) {
          console.log(`✅ Found ${response.data.length} arrivals for today`);
          setTodayArrivals(response.data);
          
          // Update stop arrival times from today's arrivals
          // Merge with local state, keeping the most recent time for each stop
          const arrivalTimes: { [key: string]: string } = { ...stopArrivalTimes };
          const arrivalTimestamps: { [key: string]: number } = { ...stopArrivalTimestamps };
          
          // Sort by timestamp descending to get most recent first
          const sortedArrivals = [...response.data].sort((a, b) => {
            const timeA = a.arrivalTimestamp ? new Date(a.arrivalTimestamp).getTime() : 0;
            const timeB = b.arrivalTimestamp ? new Date(b.arrivalTimestamp).getTime() : 0;
            return timeB - timeA;
          });
          
          // Update with most recent arrival for each stop (from API or local state)
          sortedArrivals.forEach((arrival: any) => {
            const stopName = arrival.stopName;
            const apiTimestamp = arrival.arrivalTimestamp ? new Date(arrival.arrivalTimestamp).getTime() : 0;
            const localTimestamp = arrivalTimestamps[stopName] || 0;
            
            // Use the most recent timestamp (API or local)
            if (apiTimestamp > localTimestamp) {
              arrivalTimes[stopName] = arrival.actualTime;
              arrivalTimestamps[stopName] = apiTimestamp;
            }
            // If local timestamp is newer, keep the local time (already in the objects above)
          });
          
          setStopArrivalTimes(arrivalTimes);
          setStopArrivalTimestamps(arrivalTimestamps);
          console.log('📋 Updated stop arrival times:', arrivalTimes);
        } else {
          console.log('⚠ No arrivals found for today or API error');
        }
      } catch (error) {
        console.error('❌ Error fetching today\'s arrivals:', error);
      }
    };

    fetchTodayArrivals();
    // Refresh arrivals every 30 seconds
    const interval = setInterval(fetchTodayArrivals, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Update arrival times from nearest GPS coordinates from server
  useEffect(() => {
    if (!isLive) {
      return;
    }

    const updateArrivalsFromGps = async () => {
      try {
        // Check all stops (specific stops + route stops)
        const allStops = [...specificStops, ...routeData.stopsCoordinates];
        
        const updates: { [key: string]: { time: string; timestamp: number } } = {};
        
        await Promise.all(
          allStops.map(async (stop) => {
            const nearestGps = await findNearestGpsForStop(stop.name, stop.lat, stop.lng);
            if (nearestGps && nearestGps.timestamp) {
              const gpsDate = new Date(nearestGps.timestamp);
              const hr = gpsDate.getHours();
              const min = gpsDate.getMinutes().toString().padStart(2, '0');
              const ampm = hr >= 12 ? "PM" : "AM";
              const hr12 = hr % 12 || 12;
              const time = `${hr12}:${min} ${ampm}`;
              const timestamp = gpsDate.getTime();
              
              // Only update if this timestamp is newer than what we have
              const existingTimestamp = stopArrivalTimestamps[stop.name];
              if (!existingTimestamp || timestamp > existingTimestamp) {
                updates[stop.name] = { time, timestamp };
                console.log(`📍 Found nearest GPS for ${stop.name}: ${time} (distance: ${Math.round(nearestGps.distance)}m, timestamp: ${nearestGps.timestamp})`);
              }
            }
          })
        );
        
        // Update state with new times from GPS coordinates
        if (Object.keys(updates).length > 0) {
          setStopArrivalTimes((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v.time])) }));
          setStopArrivalTimestamps((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v.timestamp])) }));
        }
      } catch (error) {
        console.error('❌ Error updating arrivals from GPS coordinates:', error);
      }
    };

    updateArrivalsFromGps();
    // Check for nearest GPS coordinates every 30 seconds
    const interval = setInterval(updateArrivalsFromGps, 30000);
    return () => clearInterval(interval);
  }, [isLive, stopArrivalTimestamps]);

  // Determine current stop
  useEffect(() => {
    const fetchCurrentStop = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutesNum = now.getMinutes();
      const minutes = minutesNum.toString().padStart(2, '0');
      const hours12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const time = `${hours12}:${minutes} ${ampm}`;

      let foundStop = null;
      for (let i = 0; i < routeData.schedule.length; i++) {
        const stopTime = routeData.schedule[i].time;
        const [time, period] = stopTime.split(' ');
        const [stopHours, stopMinutes] = time.split(':').map(Number);
        const stopHours24 = period === 'PM' && stopHours !== 12 ? stopHours + 12 : stopHours;

        if (hours < stopHours24 || (hours === stopHours24 && minutesNum < stopMinutes)) {
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
        const res = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${encodeURIComponent(gpsBusId)}`);
        
        if (!res.ok) {
          console.log('❌ GPS API returned error status:', res.status);
          setIsLive(false);
          return;
        }
        
        const data = await res.json();
        // GPS API returns 'latitude' and 'longitude' (and 'timestamp')
        if (!data || (!data.latitude && !data.lat) || (!data.longitude && !data.lon)) {
          console.log('❌ No valid GPS data received');
          setIsLive(false);
          return;
        }

        // Use the timestamp from the GPS API server to determine if tracker is live
        const gpsTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : null;
        const now = Date.now();
        const isRecent = gpsTimestamp ? (now - gpsTimestamp) < 5 * 60 * 1000 : false; // 5 minutes threshold
        
        if (!isRecent && gpsTimestamp) {
          const minutesOld = Math.round((now - gpsTimestamp) / 1000 / 60);
          console.log(`⚠️ GPS data timestamp is ${minutesOld} minutes old (timestamp: ${data.timestamp}) - tracker appears offline`);
          setIsLive(false);
          return;
        }

        if (gpsTimestamp) {
          console.log(`✅ GPS data is recent (timestamp: ${data.timestamp}, ${Math.round((now - gpsTimestamp) / 1000)} seconds ago)`);
        }

        setIsLive(true);
        // Support both 'latitude'/'longitude' (from API) and 'lat'/'lon' field names
        const busLat = parseFloat(data.latitude || data.lat);
        const busLon = parseFloat(data.longitude || data.lon);
        
        console.log('Current bus location:', { busLat, busLon, timestamp: data.timestamp, isRecent });

        // Check for specific stops first
        specificStops.forEach((stop) => {
          const distance = getDistanceFromLatLonInMeters(busLat, busLon, stop.lat, stop.lng);
          console.log(`Distance to ${stop.name}:`, distance, 'meters');
          
          // Use 100 meters threshold for detection
          if (distance < 100) {
            const stopKey = stop.name;
            // Always use current time for arrival recording, not the GPS timestamp
            const now = new Date();
            const hr = now.getHours();
            const min = now.getMinutes().toString().padStart(2, '0');
            const ampm = hr >= 12 ? "PM" : "AM";
            const hr12 = hr % 12 || 12;
            const time = `${hr12}:${min} ${ampm}`;
            // Use current timestamp, not the GPS API timestamp (which might be old)
            const timestamp = now.toISOString();

            // Check if we haven't recorded this stop in the last 2 minutes (to prevent duplicate recordings)
            // If more than 2 minutes have passed, update with new time (bus visited again)
            const lastRecordedTimestamp = stopArrivalTimestamps[stopKey];
            const nowTimestamp = now.getTime();
            const timeSinceLastRecord = lastRecordedTimestamp ? nowTimestamp - lastRecordedTimestamp : Infinity;
            const shouldRecord = !lastRecordedTimestamp || timeSinceLastRecord > 2 * 60 * 1000; // 2 minutes cooldown
            
            console.log(`Checking ${stop.name}:`, {
              lastRecorded: stopArrivalTimes[stopKey],
              lastTimestamp: lastRecordedTimestamp ? new Date(lastRecordedTimestamp).toISOString() : 'never',
              nowTimestamp: new Date(nowTimestamp).toISOString(),
              timeSinceLastRecord: Math.round(timeSinceLastRecord / 1000 / 60),
              shouldRecord
            });
            
            if (shouldRecord) {
              console.log(`📝 Recording arrival at ${stop.name} at ${time}`);
              setStopArrivalTimes((prev) => ({ ...prev, [stopKey]: time }));
              setStopArrivalTimestamps((prev) => ({ ...prev, [stopKey]: nowTimestamp }));
              
              // Send arrival data to backend for faculty dashboard
              sendArrivalData(stop.name, time, stop.lat, stop.lng, timestamp);
            } else {
              const minutesAgo = Math.round(timeSinceLastRecord / 1000 / 60);
              console.log(`⏭ Already recorded ${stop.name} at ${stopArrivalTimes[stopKey]} (${minutesAgo} minutes ago), skipping`);
            }
          }
        });

        // Also check original route stops
        routeData.stopsCoordinates.forEach((stop) => {
          const distance = getDistanceFromLatLonInMeters(busLat, busLon, stop.lat, stop.lng);
          if (distance < 50) {
            const stopKey = stop.name;
            const lastRecordedTimestamp = stopArrivalTimestamps[stopKey];
            const now = new Date();
            const nowTimestamp = now.getTime();
            const timeSinceLastRecord = lastRecordedTimestamp ? nowTimestamp - lastRecordedTimestamp : Infinity;
            const shouldRecord = !lastRecordedTimestamp || timeSinceLastRecord > 2 * 60 * 1000; // 2 minutes cooldown
            
            if (shouldRecord) {
              const hr = now.getHours();
              const min = now.getMinutes().toString().padStart(2, '0');
              const ampm = hr >= 12 ? "PM" : "AM";
              const hr12 = hr % 12 || 12;
              const time = `${hr12}:${min} ${ampm}`;
              const timestamp = now.toISOString();

              setStopArrivalTimes((prev) => ({ ...prev, [stopKey]: time }));
              setStopArrivalTimestamps((prev) => ({ ...prev, [stopKey]: nowTimestamp }));
              
              // Send arrival data to backend for faculty dashboard
              sendArrivalData(stop.name, time, stop.lat, stop.lng, timestamp);
            }
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

  const mapHtml = useMemo(
    () => `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${routeData.title} Map</title>
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      let map, marker;
      const defaultCenter = { lat: 16.5088, lng: 80.6156 }; // Andhra Hospitals area, Vijayawada

      function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
          zoom: 15,
          center: defaultCenter
        });

        marker = new google.maps.Marker({
          map,
          icon: "http://maps.google.com/mapfiles/ms/icons/bus.png",
          title: "Live ${routeData.title} Bus"
        });

        updateLocation();
        setInterval(updateLocation, 5000);
      }

      async function updateLocation() {
        try {
          const res = await fetch("https://vit-bus-backend-production-3a83.up.railway.app/");
          const data = await res.json();
          if ((data?.lat || data?.latitude) && (data?.lon || data?.longitude)) {
            const pos = { lat: parseFloat(data.lat || data.latitude), lng: parseFloat(data.lon || data.longitude) };
            marker.setPosition(pos);
            map.setCenter(pos);
          }
        } catch (e) {
          console.error("Live location error", e);
        }
      }
    </script>
    <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB48fIbQ7fTdXAp-pPf_mjXXAf2BEQMDI0&callback=initMap&callback=initMap"></script>
  </body>
  </html>`,
    [routeData.title]
  );

  const handleMapResize = () => {
    webViewRef.current?.injectJavaScript('google.maps.event.trigger(map, "resize");');
  };

  const toggleMapExpansion = () => {
    setMapExpanded(!mapExpanded);
    setTimeout(handleMapResize, 300);
  };

  // Function to get arrival status for a stop
  const getStopStatus = (stopName: string) => {
    const arrival = todayArrivals.find(a => a.stopName === stopName);
    if (arrival) {
      return {
        status: arrival.status,
        actualTime: arrival.actualTime,
        scheduledTime: arrival.scheduledTime,
        delay: arrival.delay
      };
    }
    return null;
  };

  const getOccupancyColor = (occupancy: string) => {
    switch (occupancy) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const completedStops = Object.keys(stopArrivalTimes).length;
  const totalStops = routeData.stops.length;
  const progressPercentage = (completedStops / totalStops) * 100;

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
              <View style={styles.headerTop}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                  <Text style={styles.routeTitle}>{routeData.title}</Text>
                  <Text style={styles.routeSubtitle}>{routeData.description}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={[styles.liveDot, { backgroundColor: isLive ? '#10B981' : '#EF4444' }]} />
                    <Text style={styles.liveText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
                  </Animated.View>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View 
                    style={[
                      styles.progressFill, 
                      {
                        width: `${progressPercentage}%`,
                        opacity: fadeAnim
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{completedStops}/{totalStops} stops completed</Text>
              </View>
            </LinearGradient>
            
            {/* Bottom Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.mapBottomOverlay}
            >
              <TouchableOpacity 
                style={styles.expandButtonOverlay}
                onPress={toggleMapExpansion}
                activeOpacity={0.8}
              >
                <Text style={styles.expandButtonText}>Tap to expand map</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary + '15' }]}>
              <Bus size={20} color={theme.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{routeData.busNumber}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Bus Number</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.success + '15' }]}>
              <Navigation size={20} color={theme.success} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{totalStops}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Stops</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: getOccupancyColor(routeData.occupancy) + '15' }]}>
              <Users size={20} color={getOccupancyColor(routeData.occupancy)} />
            </View>
            <Text style={[styles.statNumber, { color: getOccupancyColor(routeData.occupancy) }]}>
              {routeData.occupancy}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Occupancy</Text>
          </View>
        </Animated.View>

        {/* Route Timeline */}
        <Animated.View style={[styles.timelineSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Route Timeline</Text>
          </View>
          
          <View style={[styles.timelineContainer, { backgroundColor: theme.surface }]}>
            {routeData.stops.map((stop, index) => {
              const status = getStopStatus(stop);
              const isLast = index === routeData.stops.length - 1;
              const scheduleItem = routeData.schedule.find(item => item.stopName === stop);
              
              return (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      status?.status === 'completed' && styles.completedDot,
                      status?.status === 'current' && styles.currentDot,
                      status?.status === 'pending' && styles.pendingDot
                    ]}>
                      {status?.status === 'completed' && <CheckCircle size={16} color="#FFFFFF" />}
                      {status?.status === 'current' && <AlertCircle size={16} color="#FFFFFF" />}
                      {status?.status === 'pending' && <Text style={styles.dotNumber}>{index + 1}</Text>}
                    </View>
                    {!isLast && <View style={[
                      styles.timelineLine,
                      status?.status === 'completed' && styles.completedLine
                    ]} />}
                  </View>
                  
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={[
                        styles.stopName,
                        { color: theme.text },
                        status?.status === 'current' && { color: theme.primary }
                      ]}>
                        {stop}
                      </Text>
                      {status?.status === 'current' && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.currentBadgeText, { color: theme.primary }]}>Approaching</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.timelineDetails}>
                      <Text style={[styles.scheduledTime, { color: theme.textSecondary }]}>
                        Scheduled: {scheduleItem?.time}
                      </Text>
                      {isLive && status?.actualTime && (
                        <Text style={[styles.actualTime, { color: theme.success }]}>
                          Arrived: {status.actualTime}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Performance Metrics */}
        <Animated.View style={[styles.metricsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance Metrics</Text>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.metricValue, { color: theme.text }]}>{progressPercentage.toFixed(0)}%</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Route Completion</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.metricValue, { color: theme.text }]}>{completedStops}</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Stops Completed</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.metricValue, { color: theme.text }]}>{totalStops - completedStops}</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Remaining Stops</Text>
            </View>
            
            <View style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.metricValue, { color: isLive ? theme.success : theme.error }]}>{isLive ? 'Active' : 'Inactive'}</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Tracking Status</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} transparent={false} animationType="slide">
        <View style={[styles.expandedMapContainer, { backgroundColor: theme.background }]}>
          <LinearGradient
            colors={theme.gradientOmbreHeader}
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  headerRight: {
    alignItems: 'flex-end',
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
  expandButtonOverlay: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  testButton: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  timelineSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  timelineContainer: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentStopName: {
    color: '#F59E0B',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineDetails: {
    gap: 4,
  },
  scheduledTime: {
    fontSize: 14,
  },
  actualTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});