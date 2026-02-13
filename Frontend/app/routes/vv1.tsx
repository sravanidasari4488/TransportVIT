import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Dimensions, StatusBar } from "react-native";
import { MapPin, Clock, Users, X, Navigation, Zap, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ArrowLeft, Bus, Activity, TrendingUp, Shield } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import arrivalService from '../../src/services/arrivalService';
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get('window');

// VV1-specific data
const routeData = {
  title: "VV1",
  description: "currency nagar ↔ VIT-AP Campus",
  stops: ['currency nagar', 'govt hospital', 'varadhi', 'HP petroleum', 'undavalli centre', 'undavalli caves', 'VIT-AP Campus'],
      schedule: [
        { time: '07:50 AM', stopName: 'currency nagar' },
        { time: '07:53 AM', stopName: 'govt hospital' },
        { time: '07:55 AM', stopName: 'varadhi' },
        { time: '08:00 AM', stopName: 'HP petroleum' },
        { time: '08:05 AM', stopName: 'Undavalli centre' },
        { time: '08:08 AM', stopName: 'Undavalli caves' },
        { time: '08:45 AM', stopName: 'VIT-AP Campus' },
      ],
  occupancy: "Medium",
  busNumber: "VV-11",
  //16.520001, 80.675311
  //16.515734, 80.670804
  //16.500933, 80.633942
  //16.479950, 80.617037
  //16.491275, 80.601548
//16.497088, 80.581574
//16.496942, 80.499207
  stopsCoordinates: [
    { name: "currency nagar", lat: 16.5200, lng: 80.6753 },
    { name: "govt hospital", lat: 16.5157, lng: 80.6708 },
    { name: "varadhi", lat: 16.5009, lng: 80.6339 },
    { name: "HP pretroleum", lat: 16.4799, lng: 80.6170 },
    { name: "Undavalli centre", lat: 16.4912, lng: 80.6015 },
    { name: "Undavalli caves", lat: 16.4970, lng: 80.5815 },
    { name: "VIT-AP Campus", lat: 16.4969, lng: 80.4992 }
  ]
};//16.52777417, "busLon": 80.59336733
//16.53° N, 80.59° E 16.5258333°N, 80.5944444°E. 16.49749,"longitude":80.51553617

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

// Define specific stops with coordinates for tracking
const specificStops = [
  { name: "currency nagar", lat: 16.5200, lng: 80.6753 },
  { name: "govt hospital", lat: 16.5157, lng: 80.6708 },
  { name: "varadhi", lat: 16.5009, lng: 80.6339 },
  { name: "HP pretroleum", lat: 16.4799, lng: 80.6170 },
  { name: "Undavalli centre", lat: 16.4912, lng: 80.6015 },
  { name: "Undavalli caves", lat: 16.4970, lng: 80.5815 },
  { name: "VIT-AP Campus", lat: 16.4969, lng: 80.4992 }
];

// Function to send arrival data to backend
const sendArrivalData = async (
  routeId: string, 
  stopName: string, 
  actualTime: string, 
  lat?: number, 
  lng?: number, 
  timestamp?: string
) => {
  try {
    // Find the scheduled time for this stop
    const scheduleItem = routeData.schedule.find(item => item.stopName === stopName);
    // If no scheduled time found, use current time as scheduled time
    let scheduledTime = scheduleItem?.time || '';
    
    // If still no scheduled time, generate one from current time
    if (!scheduledTime) {
      const now = new Date();
      const hr = now.getHours();
      const min = now.getMinutes().toString().padStart(2, '0');
      const ampm = hr >= 12 ? "PM" : "AM";
      const hr12 = hr % 12 || 12;
      scheduledTime = `${hr12}:${min} ${ampm}`;
    }

    // Use provided coordinates or find from route data
    let stopCoordinates = lat && lng 
      ? { lat, lng } 
      : routeData.stopsCoordinates.find(stop => stop.name === stopName);
    
    // Ensure we have valid coordinates
    if (!lat || !lng) {
      if (!stopCoordinates) {
        console.error('No coordinates found for stop:', stopName);
        return;
      }
    }
    
    const arrivalData = {
      routeId: routeId.toLowerCase(),
      busNumber: routeData.busNumber,
      stopName: stopName,
      scheduledTime: scheduledTime,
      actualTime: actualTime,
      // Always use current timestamp for arrivalTimestamp, not the GPS API timestamp
      arrivalTimestamp: new Date().toISOString(),
      location: {
        lat: lat || stopCoordinates?.lat || 0,
        lng: lng || stopCoordinates?.lng || 0
      },
      occupancy: routeData.occupancy.toLowerCase(),
      passengerCount: 0,
      driverNotes: '',
      weather: 'clear',
      trafficCondition: 'moderate',
      status: 'on_time'
    };

    const endpoint = `${API_CONFIG.BASE_URL}/api/arrivals`;
    console.log('📤 Sending arrival data to:', endpoint);
    console.log('📦 Arrival data payload:', JSON.stringify(arrivalData, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arrivalData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Arrival data saved successfully!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    } else if (response.status === 409) {
      // Arrival already exists - try to update it with PUT/PATCH
      console.log('⚠️ Arrival already exists, attempting to update...');
      try {
        const updateResponse = await fetch(`${API_CONFIG.BASE_URL}/api/arrivals/${routeId.toLowerCase()}/${stopName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(arrivalData),
        });
        
        if (updateResponse.ok) {
          console.log('✅ Arrival data updated successfully!');
        } else {
          console.log('⚠️ Update failed, but UI will still show new time');
        }
      } catch (updateError) {
        console.log('⚠️ Update request failed, but UI will still show new time');
      }
      // Note: Even if update fails, the UI state is already updated with new time
    } else {
      console.error('❌ Failed to save arrival data. Status:', response.status);
      console.error('📋 Response:', JSON.stringify(result, null, 2));
      console.error('📦 Sent data:', JSON.stringify(arrivalData, null, 2));
    }
  } catch (error) {
    console.error('Error sending arrival data:', error);
  }
};

export default function VV1Route() {
  const router = useRouter();
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
  const findNearestGpsForStop = async (stopName: string, stopLat: number, stopLng: number, routeId: string): Promise<{ timestamp: string; distance: number } | null> => {
    try {
      // Try to get GPS locations for this route
      // We'll use the latest location API and also try to get route history
      const gpsRouteId = routeId === 'vv1' ? 'VV-11' : routeId.toUpperCase(); // VV1 uses VV-11 GPS endpoint
      
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
        console.log('🔄 Fetching today\'s arrivals for vv1...');
        const response = await arrivalService.getTodayArrivals('vv1');
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
            const nearestGps = await findNearestGpsForStop(stop.name, stop.lat, stop.lng, 'vv1');
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
        const res = await fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-11"); // VV1 uses VV-11
        
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
              sendArrivalData('vv1', stop.name, time, stop.lat, stop.lng, timestamp);
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
              sendArrivalData('vv1', stop.name, time, stop.lat, stop.lng, timestamp);
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

  const mapHtml = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>VV1 Map</title>
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
          title: "Live VV1 Bus"
        });

        updateLocation();
        setInterval(updateLocation, 5000);
      }

      async function updateLocation() {
        try {
          const res = await fetch("https://git-backend-1-production.up.railway.app/api/gps/latest_location/VV-11"); // VV1 uses VV-11
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
  </html>`;

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      
      {/* Modern Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1E293B', '#334155', '#475569']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
              <TouchableOpacity 
                style={styles.testButton} 
                onPress={() => {
                  // Always use current time for manual test
                  const now = new Date();
                  const hr = now.getHours();
                  const min = now.getMinutes().toString().padStart(2, '0');
                  const ampm = hr >= 12 ? "PM" : "AM";
                  const hr12 = hr % 12 || 12;
                  const time = `${hr12}:${min} ${ampm}`;
                  const timestamp = now.toISOString();
                  console.log('🧪 Manual test: Recording VIT-AP arrival at', timestamp);
                  sendArrivalData('vv1', 'VIT-AP', time, 16.497358, 80.49956783, timestamp);
                }}
              >
                <Text style={styles.testButtonText}>Test Save</Text>
              </TouchableOpacity>
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
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Bus size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{routeData.busNumber}</Text>
            <Text style={styles.statLabel}>Bus Number</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Navigation size={20} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{totalStops}</Text>
            <Text style={styles.statLabel}>Total Stops</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Users size={20} color={getOccupancyColor(routeData.occupancy)} />
            </View>
            <Text style={[styles.statNumber, { color: getOccupancyColor(routeData.occupancy) }]}>
              {routeData.occupancy}
            </Text>
            <Text style={styles.statLabel}>Occupancy</Text>
          </View>
        </Animated.View>

        {/* Live Map */}
        <Animated.View style={[styles.mapSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MapPin size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Live Tracking</Text>
            </View>
            <TouchableOpacity style={styles.expandButton} onPress={toggleMapExpansion}>
              <Text style={styles.expandButtonText}>Full Screen</Text>
            </TouchableOpacity>
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
        </Animated.View>

        {/* Route Timeline */}
        <Animated.View style={[styles.timelineSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Route Timeline</Text>
          </View>
          
          <View style={styles.timelineContainer}>
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
                        status?.status === 'current' && styles.currentStopName
                      ]}>
                        {stop}
                      </Text>
                      {status?.status === 'current' && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Approaching</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.timelineDetails}>
                      <Text style={styles.scheduledTime}>
                        Scheduled: {scheduleItem?.time}
                      </Text>
                      {isLive && status?.actualTime && (
                        <Text style={styles.actualTime}>
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
            <TrendingUp size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{progressPercentage.toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>Route Completion</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{completedStops}</Text>
              <Text style={styles.metricLabel}>Stops Completed</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{totalStops - completedStops}</Text>
              <Text style={styles.metricLabel}>Remaining Stops</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{isLive ? 'Active' : 'Inactive'}</Text>
              <Text style={styles.metricLabel}>Tracking Status</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Expanded Map Modal */}
      <Modal visible={mapExpanded} transparent={false} animationType="slide">
        <View style={styles.expandedMapContainer}>
          <LinearGradient
            colors={['#1E293B', '#334155']}
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 60,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: '#CBD5E1',
  },
  headerRight: {
    alignItems: 'flex-end',
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
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
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
    elevation: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  mapSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  expandButton: {
    backgroundColor: '#3B82F6',
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
    elevation: 4,
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
  timelineSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
  },
  currentStopName: {
    color: '#F59E0B',
  },
  currentBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  timelineDetails: {
    gap: 4,
  },
  scheduledTime: {
    fontSize: 14,
    color: '#64748B',
  },
  actualTime: {
    fontSize: 14,
    color: '#10B981',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
