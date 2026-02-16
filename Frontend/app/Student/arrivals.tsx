import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, StatusBar, ActivityIndicator, Animated } from 'react-native';
import { Calendar, RefreshCw, MapPin, Bus, Clock, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import { io, Socket } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

interface StopWithArrival {
  name: string;
  scheduledTime: string;
  location: {
    lat: number;
    lon: number;
  };
  gpsLocation?: { 
    lat: number; 
    lon: number; 
    timestamp?: string; 
    date?: string; 
    time?: string; 
  } | null;
  isActive: boolean;
  actualTime: string | null;
  arrivalTimestamp: string | null;
  delay: number | null;
  status: 'on_time' | 'delayed' | 'early' | 'pending';
}

interface RouteWithStops {
  routeId: string;
  routeName: string;
  stops: StopWithArrival[];
  totalStops: number;
  completedStops: number;
}

export default function StudentArrivals() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { selectedRouteId, user } = useAuth();
  const [route, setRoute] = useState<RouteWithStops | null>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<boolean>(false);
  const [gpsTimestamps, setGpsTimestamps] = useState<Record<string, { timestamp: string; time: string }>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Get distance between two coordinates
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Route stops map (same as Faculty dashboard)
  const routeStopsMap: Record<string, { stops: string[], schedule: Array<{ time: string, stopName?: string }>, stopsCoordinates?: Array<{ name: string, lat: number, lng: number }> }> = {
    'VV1': {
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
      stopsCoordinates: [
        { name: "currency nagar", lat: 16.5200, lng: 80.6753 },
        { name: "govt hospital", lat: 16.5157, lng: 80.6708 },
        { name: "varadhi", lat: 16.5009, lng: 80.6339 },
        { name: "HP pretroleum", lat: 16.4799, lng: 80.6170 },
        { name: "Undavalli centre", lat: 16.4912, lng: 80.6015 },
        { name: "Undavalli caves", lat: 16.4970, lng: 80.5815 },
        { name: "VIT-AP Campus", lat: 16.4969, lng: 80.4992 }
      ]
    },
    'VV2': {
      stops: ['Poranki Center', 'Thumu Center', 'Tadigadapa', 'KCP Colony', 'VR Siddartha', 'Bharath Petrol Pump', 'Kamayyathopu', 'Time Hospital'],
      schedule: [
        { time: '07:40 AM', stopName: 'Poranki Center' },
        { time: '07:43 AM', stopName: 'Thumu Center' },
        { time: '07:45 AM', stopName: 'Tadigadapa' },
        { time: '07:48 AM', stopName: 'KCP Colony' },
        { time: '07:50 AM', stopName: 'VR Siddartha' },
        { time: '07:52 AM', stopName: 'Bharath Petrol Pump' },
        { time: '07:55 AM', stopName: 'Kamayyathopu' },
        { time: '08:00 AM', stopName: 'Time Hospital' },
      ]
    },
    'VV3': {
      stops: ['kamayyathopu center', 'pappula mill center', 'ashok nagar', 'time hospital', 'auto nagar gate', 'screw bridge'],
      schedule: [
        { time: '07:40 AM', stopName: 'kamayyathopu center' },
        { time: '07:42 AM', stopName: 'pappula mill center' },
        { time: '07:45 AM', stopName: 'ashok nagar' },
        { time: '07:47 AM', stopName: 'time hospital' },
        { time: '07:48 AM', stopName: 'auto nagar gate' },
        { time: '07:58 AM', stopName: 'screw bridge' },
      ]
    },
    'VV4': {
      stops: ['time hospital', 'auto nagar gate', 'patamata(high school road)', 'P&T colony - NTR circle', 'screw bridge'],
      schedule: [
        { time: '07:45 AM', stopName: 'time hospital' },
        { time: '07:46 AM', stopName: 'auto nagar gate' },
        { time: '07:48 AM', stopName: 'patamata(high school road)' },
        { time: '07:50 AM', stopName: 'P&T colony - NTR circle' },
        { time: '08:00 AM', stopName: 'screw bridge' },
      ]
    },
    'VV5': {
      stops: ['auto nagar gate', 'high school road', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'ramesh hospital'],
      schedule: [
        { time: '07:35 AM', stopName: 'auto nagar gate' },
        { time: '07:37 AM', stopName: 'high school road' },
        { time: '07:40 AM', stopName: ' NTR circle' },
        { time: '07:42 AM', stopName: 'eenadu' },
        { time: '07:44 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:50 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:52 AM', stopName: 'ramesh hospital' },
      ]
    },
    'VV6': {
      stops: ['patamata e seva', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'khandhari(MVR)', 'PVP mall', 'labbipet (venkateswara swamy)', 'ramesh hospital', 'balaji nagar', 'varadhi'],
      schedule: [
        { time: '07:30 AM', stopName: 'patamata e seva' },
        { time: '07:32 AM', stopName: ' NTR circle' },
        { time: '07:35 AM', stopName: 'eenadu' },
        { time: '07:37 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:40 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:44 AM', stopName: 'khandhari(MVR)' },
        { time: '07:50 AM', stopName: 'PVP mall' },
        { time: '07:52 AM', stopName: 'labbipet (venkateswara swamy)' },
        { time: '07:54 AM', stopName: 'ramesh hospital' },
        { time: '07:56 AM', stopName: 'balaji nagar' },
        { time: '08:00 AM', stopName: 'varadhi' },
      ]
    },
    'VV7': {
      stops: ['patamata e seva', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'khandhari(MVR)', 'PVP mall', 'labbipet (venkateswara swamy)', 'ramesh hospital', 'balaji nagar', 'varadhi'],
      schedule: [
        { time: '07:30 AM', stopName: 'patamata e seva' },
        { time: '07:32 AM', stopName: ' NTR circle' },
        { time: '07:35 AM', stopName: 'eenadu' },
        { time: '07:37 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:40 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:44 AM', stopName: 'khandhari(MVR)' },
        { time: '07:50 AM', stopName: 'PVP mall' },
        { time: '07:52 AM', stopName: 'labbipet (venkateswara swamy)' },
        { time: '07:54 AM', stopName: 'ramesh hospital' },
        { time: '07:56 AM', stopName: 'balaji nagar' },
        { time: '08:00 AM', stopName: 'varadhi' },
      ]
    },
    'VV8': {
      stops: ['patamata e seva', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'khandhari(MVR)', 'PVP mall', 'labbipet (venkateswara swamy)', 'ramesh hospital', 'balaji nagar', 'varadhi'],
      schedule: [
        { time: '07:30 AM', stopName: 'patamata e seva' },
        { time: '07:32 AM', stopName: ' NTR circle' },
        { time: '07:35 AM', stopName: 'eenadu' },
        { time: '07:37 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:40 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:44 AM', stopName: 'khandhari(MVR)' },
        { time: '07:50 AM', stopName: 'PVP mall' },
        { time: '07:52 AM', stopName: 'labbipet (venkateswara swamy)' },
        { time: '07:54 AM', stopName: 'ramesh hospital' },
        { time: '07:56 AM', stopName: 'balaji nagar' },
        { time: '08:00 AM', stopName: 'varadhi' },
      ]
    },
    'VV9': {
      stops: ['patamata e seva', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'khandhari(MVR)', 'PVP mall', 'labbipet (venkateswara swamy)', 'ramesh hospital', 'balaji nagar', 'varadhi'],
      schedule: [
        { time: '07:30 AM', stopName: 'patamata e seva' },
        { time: '07:32 AM', stopName: ' NTR circle' },
        { time: '07:35 AM', stopName: 'eenadu' },
        { time: '07:37 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:40 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:44 AM', stopName: 'khandhari(MVR)' },
        { time: '07:50 AM', stopName: 'PVP mall' },
        { time: '07:52 AM', stopName: 'labbipet (venkateswara swamy)' },
        { time: '07:54 AM', stopName: 'ramesh hospital' },
        { time: '07:56 AM', stopName: 'balaji nagar' },
        { time: '08:00 AM', stopName: 'varadhi' },
      ]
    },
    'VV10': {
      stops: ['patamata e seva', ' NTR circle', 'eenadu', 'benz circle(bajaj showroom)', 'DV manor(sweet magic)', 'khandhari(MVR)', 'PVP mall', 'labbipet (venkateswara swamy)', 'ramesh hospital', 'balaji nagar', 'varadhi'],
      schedule: [
        { time: '07:30 AM', stopName: 'patamata e seva' },
        { time: '07:32 AM', stopName: ' NTR circle' },
        { time: '07:35 AM', stopName: 'eenadu' },
        { time: '07:37 AM', stopName: 'benz circle(bajaj showroom)' },
        { time: '07:40 AM', stopName: 'DV manor(sweet magic)' },
        { time: '07:44 AM', stopName: 'khandhari(MVR)' },
        { time: '07:50 AM', stopName: 'PVP mall' },
        { time: '07:52 AM', stopName: 'labbipet (venkateswara swamy)' },
        { time: '07:54 AM', stopName: 'ramesh hospital' },
        { time: '07:56 AM', stopName: 'balaji nagar' },
        { time: '08:00 AM', stopName: 'varadhi' },
      ]
    },
    'GV1': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV2': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV3': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV4': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV5': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV6': {
      stops: ['swamy theatre', 'TJPS college', 'kankarakunta bridge', 'market', 'bus stand', 'auto nagar - guntur'],
      schedule: [
        { time: '07:26 AM', stopName: 'swamy theatre' },
        { time: '07:27 AM', stopName: 'TJPS college' },
        { time: '07:38 AM', stopName: 'kankarakunta bridge' },
        { time: '07:32 AM', stopName: 'market' },
        { time: '07:42 AM', stopName: 'bus stand' },
      ]
    },
    'GV7': {
      stops: ['palakaluru', 'gujjana gundla current office', 'gujjana gundla', 'JKC college', 'RTO office road,', 'chillies', 'SGV'],
      schedule: [
        { time: '07:10 AM', stopName: 'palakaluru' },
        { time: '07:20 AM', stopName: 'gujjana gundla current office' },
        { time: '07:23 AM', stopName: 'gujjana gundla' },
        { time: '07:24 AM', stopName: 'JKC college' },
        { time: '07:25 AM', stopName: 'RTO office road,' },
        { time: '07:28 AM', stopName: 'chillies' },
        { time: '07:29 AM', stopName: 'SGV' },
      ]
    },
    'GV8': {
      stops: ['vidhya nagar', 'saibaba temple road', 'kottipadu library center', 'gandhi statue center', 'harihara temple', 'kalamandir'],
      schedule: [
        { time: '07:25 AM', stopName: 'vidhya nagar' },
        { time: '07:30 AM', stopName: 'saibaba temple road' },
        { time: '07:31 AM', stopName: 'kottipadu library center' },
        { time: '07:32 AM', stopName: 'gandhi statue center' },
        { time: '07:33 AM', stopName: 'harihara temple' },
        { time: '07:34 AM', stopName: 'kalamandir' },
      ]
    },
    'GV9': {
      stops: ['vidhya nagar', 'navabharath nagar', 'JKC college', 'new RTO office', 'swarna bharath nagar', 'chillies'],
      schedule: [
        { time: '07:30 AM', stopName: 'vidhya nagar' },
        { time: '07:31 AM', stopName: 'navabharath nagar' },
        { time: '07:31 AM', stopName: 'JKC college' },
        { time: '07:37 AM', stopName: 'new RTO office' },
        { time: '07:38 AM', stopName: 'swarna bharath nagar' },
        { time: '07:42 AM', stopName: 'chillies' },
      ]
    },
    'GV10': {
      stops: ['inner ring road', 'vijaya digitals', 'baristha', 'ysr bomma', 'sri chaitanya school', 'reliance petrol pump'],
      schedule: [
        { time: '07:30 AM', stopName: 'inner ring road' },
        { time: '07:32 AM', stopName: 'vijaya digitals' },
        { time: '07:35 AM', stopName: 'baristha' },
        { time: '07:37 AM', stopName: 'ysr bomma' },
        { time: '07:38 AM', stopName: 'sri chaitanya school' },
        { time: '07:40 AM', stopName: 'reliance petrol pump' },
      ]
    },
  };

  // Fetch route with stops and arrivals
  const fetchRouteWithStops = async () => {
    if (!selectedRouteId) {
      Alert.alert('No Route Selected', 'Please select your bus route first.');
      router.push('/Student/select-route');
      return;
    }

    setLoading(true);
    try {
      const routeIdUpper = selectedRouteId.toUpperCase();
      
      // Fetch route stops
      let response = await fetch(`${API_CONFIG.BASE_URL}/api/routes/${routeIdUpper}/stops-with-arrivals`);
      
      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_CONFIG.BASE_URL}/api/routes/${selectedRouteId}/stops-with-arrivals`);
      }

      let stops: StopWithArrival[] = [];
      const routeStops = routeStopsMap[routeIdUpper];

      // Fetch arrivals for this route
      let arrivalData: any[] = [];
      try {
        const arrivalsResponse = await fetch(`${API_CONFIG.BASE_URL}/api/arrivals/route/${selectedRouteId.toLowerCase()}/today`);
        if (arrivalsResponse.ok) {
          const arrivalsResult = await arrivalsResponse.json();
          if (arrivalsResult.success && arrivalsResult.data) {
            arrivalData = Array.isArray(arrivalsResult.data) ? arrivalsResult.data : [];
          }
        }
      } catch (err) {
        console.warn(`Could not fetch arrivals for ${selectedRouteId}:`, err);
      }

      // Create arrival map
      const arrivalMap: Record<string, any> = {};
      arrivalData.forEach((arrival: any) => {
        const stopKey = (arrival.stopName || '').toLowerCase().trim();
        if (!arrivalMap[stopKey] || 
            (arrival.arrivalTimestamp && 
             new Date(arrival.arrivalTimestamp) > new Date(arrivalMap[stopKey].arrivalTimestamp || 0))) {
          arrivalMap[stopKey] = {
            arrivalTimestamp: arrival.arrivalTimestamp,
            delay: arrival.delay,
            status: arrival.status
          };
        }
      });

      // Fetch GPS locations
      const routeToGpsMap: Record<string, string> = {
        'VV1': 'VV-11',
        'VV2': 'VV-11',
      };
      const gpsRouteId = routeToGpsMap[routeIdUpper] || routeIdUpper;
      
      let allGpsLocations: any[] = [];
      try {
        const dateParam = selectedDate ? `?date=${selectedDate}` : '';
        const allLocationsRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/all_locations/${gpsRouteId}${dateParam}`);
        if (allLocationsRes.ok) {
          const allLocationsData = await allLocationsRes.json();
          if (Array.isArray(allLocationsData)) {
            allGpsLocations = allLocationsData.map((gps: any) => ({
              lat: gps.lat || gps.latitude,
              lon: gps.lon || gps.longitude,
              timestamp: gps.timestamp,
              stopName: gps.stopName || null,
            })).filter((gps: any) => gps.lat && gps.lon && gps.timestamp);
          }
        }
      } catch (e) {
        console.log(`⚠️ Could not fetch GPS locations:`, e);
      }

      // Match stops with GPS data
      const stopCoordinatesMap: Record<string, { lat: number; lon: number; timestamp: string; date: string; time: string }> = {};
      
      if (routeStops && routeStops.stops.length > 0) {
        stops = routeStops.stops.map((stopName, index) => {
          const scheduleItem = routeStops.schedule.find(s => s.stopName === stopName) || 
                             routeStops.schedule[index] || 
                             { time: 'N/A' };
          const stopKey = stopName.toLowerCase();
          const arrival = arrivalMap[stopKey];
          
          // Get GPS coordinates
          const stopCoord = routeStops.stopsCoordinates?.find(
            (coord: any) => coord.name.toLowerCase().trim() === stopKey.toLowerCase().trim()
          );
          
          let matchedGps: any = null;
          if (stopCoord && allGpsLocations.length > 0) {
            matchedGps = allGpsLocations.reduce((bestMatch: any, gps: any) => {
              if (!gps.lat || !gps.lon) return bestMatch;
              const distance = getDistanceFromLatLonInMeters(
                stopCoord.lat, stopCoord.lng, gps.lat, gps.lon
              );
              if (distance < 200) {
                if (!bestMatch || new Date(gps.timestamp).getTime() > new Date(bestMatch.timestamp).getTime()) {
                  return { ...gps, distance };
                }
              }
              return bestMatch;
            }, null);
          }

          if (matchedGps) {
            const timestampDate = new Date(matchedGps.timestamp);
            stopCoordinatesMap[stopKey] = {
              lat: matchedGps.lat,
              lon: matchedGps.lon,
              timestamp: matchedGps.timestamp,
              date: timestampDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              time: timestampDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            };
          }

          const gpsCoords = stopCoordinatesMap[stopKey];
          const gpsTimestamp = gpsCoords?.timestamp || (arrival ? arrival.arrivalTimestamp : null);

          return {
            name: stopName,
            scheduledTime: scheduleItem.time || 'N/A',
            location: stopCoord ? { lat: stopCoord.lat, lon: stopCoord.lng } : { lat: 0, lon: 0 },
            isActive: true,
            actualTime: null,
            arrivalTimestamp: gpsTimestamp,
            delay: arrival ? arrival.delay : null,
            status: arrival ? arrival.status : ('pending' as const),
            gpsLocation: gpsCoords ? {
              lat: gpsCoords.lat,
              lon: gpsCoords.lon,
              timestamp: gpsCoords.timestamp,
              date: gpsCoords.date,
              time: gpsCoords.time
            } : null
          };
        });
      }

      setRoute({
        routeId: routeIdUpper,
        routeName: `${routeIdUpper} Bus Route`,
        stops: stops,
        totalStops: stops.length,
        completedStops: stops.filter(s => s.arrivalTimestamp !== null).length
      });

    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route information');
    } finally {
      setLoading(false);
    }
  };

  // Check if arrival is live (within last 5 minutes)
  const isArrivalLive = (timestamp: string): boolean => {
    const arrivalTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - arrivalTime) < 5 * 60 * 1000; // 5 minutes
  };

  // Format local time
  const formatLocalTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const hr = date.getHours();
    const min = date.getMinutes().toString().padStart(2, '0');
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:${min} ${ampm}`;
  };

  // Socket connection for real-time updates
  useEffect(() => {
    if (!selectedRouteId) return;

    const socketUrl = API_CONFIG.BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setSocketConnected(true);
      newSocket.emit('join-route', { routeId: selectedRouteId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('arrival-update', (data: any) => {
      console.log('📥 Received arrival update:', data);
      if (data.routeId && data.routeId.toUpperCase() === selectedRouteId.toUpperCase()) {
        fetchRouteWithStops();
      }
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [selectedRouteId]);

  // Fetch route on mount and when date changes
  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteWithStops();
    }
  }, [selectedRouteId, selectedDate]);

  // Update GPS timestamps periodically
  useEffect(() => {
    if (!route || !selectedRouteId) return;

    const updateGpsTimestamps = async () => {
      const routeIdUpper = selectedRouteId.toUpperCase();
      const routeToGpsMap: Record<string, string> = {
        'VV1': 'VV-11',
        'VV2': 'VV-11',
      };
      const gpsRouteId = routeToGpsMap[routeIdUpper] || routeIdUpper;
      
      let allGpsLocations: any[] = [];
      try {
        const dateParam = selectedDate ? `?date=${selectedDate}` : '';
        const allLocationsRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/all_locations/${gpsRouteId}${dateParam}`);
        if (allLocationsRes.ok) {
          const allLocationsData = await allLocationsRes.json();
          if (Array.isArray(allLocationsData)) {
            allGpsLocations = allLocationsData.map((gps: any) => ({
              lat: gps.lat || gps.latitude,
              lon: gps.lon || gps.longitude,
              timestamp: gps.timestamp,
            })).filter((gps: any) => gps.lat && gps.lon && gps.timestamp);
          }
        }
      } catch (e) {
        console.log(`⚠️ Could not fetch GPS locations:`, e);
      }

      const routeStops = routeStopsMap[routeIdUpper];
      const updates: Record<string, { timestamp: string; time: string }> = {};

      route.stops.forEach((stop) => {
        const stopCoord = routeStops?.stopsCoordinates?.find(
          (coord: any) => coord.name.toLowerCase().trim() === stop.name.toLowerCase().trim()
        );
        
        if (stopCoord && allGpsLocations.length > 0) {
          const matchedGps = allGpsLocations.reduce((bestMatch: any, gps: any) => {
            if (!gps.lat || !gps.lon) return bestMatch;
            const distance = getDistanceFromLatLonInMeters(stopCoord.lat, stopCoord.lng, gps.lat, gps.lon);
            if (distance < 200) {
              if (!bestMatch || new Date(gps.timestamp).getTime() > new Date(bestMatch.timestamp).getTime()) {
                return { ...gps, distance };
              }
            }
            return bestMatch;
          }, null);

          if (matchedGps && matchedGps.timestamp) {
            const gpsDate = new Date(matchedGps.timestamp);
            const hr = gpsDate.getHours();
            const min = gpsDate.getMinutes().toString().padStart(2, '0');
            const ampm = hr >= 12 ? "PM" : "AM";
            const hr12 = hr % 12 || 12;
            const time = `${hr12}:${min} ${ampm}`;
            
            updates[stop.name] = {
              timestamp: matchedGps.timestamp,
              time: time
            };
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        setGpsTimestamps(updates);
      }
    };

    updateGpsTimestamps();
    const interval = setInterval(updateGpsTimestamps, 30000);
    return () => clearInterval(interval);
  }, [route, selectedDate, selectedRouteId]);

  const handleManualRefresh = async () => {
    await fetchRouteWithStops();
  };

  const theme = colors[isDark ? 'dark' : 'light'];

  if (!selectedRouteId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />
        <View style={styles.emptyContainer}>
          <Bus size={64} color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No Route Selected</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Please select your bus route first
          </Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/Student/select-route')}
          >
            <Text style={styles.selectButtonText}>Select Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />

      {/* Header */}
      <LinearGradient
        colors={theme.gradientOmbreHeader || theme.gradientOmbre}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Route Arrivals</Text>
            <Text style={styles.headerSubtitle}>{selectedRouteId.toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* Date Picker */}
      <Animated.View
        style={[
          styles.datePickerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.datePickerButton, { backgroundColor: theme.surface }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={18} color={theme.primary} />
          <Text style={[styles.datePickerText, { color: theme.text }]}>
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Today'
              : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, socketConnected ? styles.statusBadgeLive : styles.statusBadgeOffline]}>
          <View style={[styles.statusDot, socketConnected && styles.statusDotLive]} />
          <Text style={styles.statusText}>{socketConnected ? 'LIVE' : 'OFFLINE'}</Text>
        </View>
      </Animated.View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.dateInputContainer}>
              <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Date:</Text>
              <TextInput
                style={[styles.dateInput, {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={selectedDate}
                onChangeText={(text) => setSelectedDate(text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
              />
              <Text style={[styles.dateHint, { color: theme.textSecondary }]}>
                Format: YYYY-MM-DD (e.g., 2025-12-12)
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[styles.modalButtonTextSecondary, { color: theme.text }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalButtonTextPrimary}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Route Stops */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading arrivals...</Text>
          </View>
        ) : !route || route.stops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text }]}>No stops available</Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.routeCard,
              {
                backgroundColor: theme.surface,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Route Header */}
            <View style={styles.routeHeader}>
              <View style={styles.routeHeaderLeft}>
                <View style={[styles.routeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Bus size={24} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.routeId, { color: theme.text }]}>{route.routeId}</Text>
                  <Text style={[styles.routeDescription, { color: theme.textSecondary }]}>
                    {route.completedStops} of {route.totalStops} stops completed
                  </Text>
                </View>
              </View>
            </View>

            {/* Stops Table */}
            <View style={styles.stopsTable}>
              <View style={[styles.tableHeader, { backgroundColor: theme.background }]}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>STOP</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>SCHEDULED</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary }]}>ACTUAL</Text>
              </View>

              {route.stops.map((stop, index) => {
                const isLive = stop.arrivalTimestamp && isArrivalLive(stop.arrivalTimestamp);
                const gpsData = gpsTimestamps[stop.name];
                
                const today = new Date().toISOString().split('T')[0];
                const isToday = selectedDate === today;
                
                let displayTime = '-';
                
                if (stop.gpsLocation?.time) {
                  displayTime = stop.gpsLocation.time;
                } else if (gpsData && gpsData.time) {
                  if (!isToday || trackerStatus) {
                    displayTime = gpsData.time;
                  }
                } else if (stop.arrivalTimestamp) {
                  if (!isToday || trackerStatus) {
                    try {
                      displayTime = formatLocalTime(stop.arrivalTimestamp);
                    } catch (e) {
                      displayTime = '-';
                    }
                  }
                }

                return (
                  <View
                    key={index}
                    style={[
                      styles.stopRow,
                      { borderBottomColor: theme.border },
                      index === route.stops.length - 1 && styles.stopRowLast
                    ]}
                  >
                    <View style={styles.stopCell}>
                      <MapPin size={14} color={theme.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stopName, { color: theme.text }]}>{stop.name}</Text>
                      </View>
                    </View>
                    <Text style={[styles.scheduledTime, { color: theme.textSecondary }]}>{stop.scheduledTime}</Text>
                    <View style={styles.actualTimeCell}>
                      {isLive && trackerStatus && <View style={styles.liveDot} />}
                      <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Text style={[
                          styles.actualTime,
                          { color: theme.textSecondary },
                          displayTime !== '-' && styles.actualTimeArrived
                        ]}>
                          {displayTime}
                        </Text>
                        {stop.gpsLocation?.date && displayTime !== '-' && (
                          <Text style={[styles.coordinateText, { color: theme.textSecondary }]}>
                            {stop.gpsLocation.date}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  datePickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    alignItems: 'center',
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  datePickerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  statusDotLive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  dateHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  selectButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  routeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  routeHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  routeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeId: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  stopsTable: {
    backgroundColor: 'transparent',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  stopRowLast: {
    borderBottomWidth: 0,
  },
  stopCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduledTime: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  actualTimeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  actualTime: {
    fontSize: 14,
    minWidth: 80,
    textAlign: 'right',
  },
  actualTimeArrived: {
    color: '#10B981',
    fontWeight: '700',
  },
  coordinateText: {
    fontSize: 10,
    marginTop: 2,
  },
});

