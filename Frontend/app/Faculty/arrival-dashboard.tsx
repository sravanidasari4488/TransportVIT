import React, { useState, useEffect, useRef } from 'react';               
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, StatusBar } from 'react-native';
import { ArrowLeft, Calendar, Filter, Search, Plus, Edit, Trash2, Clock, MapPin, Bus, TrendingUp, BarChart3, Download, RefreshCw, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../(auth)/context/ThemeContext';
import { colors } from '../constants/colors';
import arrivalService from '../../src/services/arrivalService';
import trackerService from '../../src/services/trackerService';
import { API_CONFIG } from '../config/api';
import { io, Socket } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

interface ArrivalData {
  _id: string;
  routeId: string;
  busNumber: string;
  stopName: string;
  scheduledTime: string;
  actualTime: string;
  arrivalTimestamp: string;
  delay: number;
  status: 'on_time' | 'delayed' | 'early';
  location: {
    lat: number;
    lng: number;
  };
  occupancy: 'low' | 'medium' | 'high';
  passengerCount: number;
  driverNotes: string;
  weather: string;
  trafficCondition: 'light' | 'moderate' | 'heavy';
  trackerInfo?: {
    trackerId: string;
    trackerName: string;
    currentArea: string;
    currentTime: string;
    speed: number;
    batteryLevel: number;
    signalStrength: number;
    isOnline: boolean;
  };
}

interface ArrivalStats {
  totalArrivals: number;
  onTimeArrivals: number;
  delayedArrivals: number;
  onTimePercentage: number;
  averageDelay: number;
}

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
  } | null; // GPS coordinates from MongoDB Atlas
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

export default function ArrivalsDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark } = useTheme();
  const [routes, setRoutes] = useState<RouteWithStops[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<Record<string, boolean>>({}); // routeId -> isOnline
  const [gpsTimestamps, setGpsTimestamps] = useState<Record<string, Record<string, { timestamp: string; time: string }>>>({}); // routeId -> stopName -> {timestamp, time}
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Utility function to calculate distance in meters
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Function to find nearest GPS coordinate from server for a stop
  const findNearestGpsForStop = async (stopName: string, stopLat: number, stopLng: number, routeId: string): Promise<{ timestamp: string; distance: number; lat: number; lon: number } | null> => {
    try {
      // Map route IDs to GPS route format
      const routeIdUpper = routeId.toUpperCase();
      const routeToGpsMap: Record<string, string> = {
        'VV1': 'VV-11', // VV1 uses VV-11 GPS endpoint
        'VV2': 'VV-11',
        // Add more mappings as needed
      };
      const gpsRouteId = routeToGpsMap[routeIdUpper] || routeIdUpper;
      
      // Fetch GPS locations from server - try multiple endpoints to get all GPS data
      let gpsLocations: any[] = [];
      
      // Method 1: Try to get GPS route history (all GPS locations for this route)
      try {
        const historyRes = await fetch(`https://git-backend-1-production.up.railway.app/api/stops/route/${gpsRouteId}/history`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData)) {
            // Ensure all GPS locations have lat/lon and timestamp from server
            gpsLocations = historyData.map((gps: any) => ({
              lat: gps.lat || gps.latitude,
              lon: gps.lon || gps.longitude,
              timestamp: gps.timestamp
            })).filter((gps: any) => gps.lat && gps.lon && gps.timestamp); // Only include valid GPS data
            console.log(`📍 Fetched ${gpsLocations.length} GPS locations from history for ${gpsRouteId} (with lat/lon from server)`);
          }
        }
      } catch (e) {
        console.log(`⚠️ History endpoint not available for ${gpsRouteId}, trying latest location`);
      }
      
      // Method 2: Always get latest location from GPS server
      try {
        const latestRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${gpsRouteId}`);
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData && (latestData.latitude || latestData.lat) && latestData.timestamp) {
            const lat = latestData.latitude || latestData.lat;
            const lng = latestData.longitude || latestData.lon;
            const distance = getDistanceFromLatLonInMeters(stopLat, stopLng, lat, lng);
            // Add latest location to the list (even if > 200m, we'll check distance later)
            // Check if this location is not already in the list
            const alreadyExists = gpsLocations.some(gps => 
              gps.timestamp === latestData.timestamp &&
              (gps.lat === lat || gps.latitude === lat) &&
              (gps.lon === lng || gps.longitude === lng)
            );
            if (!alreadyExists) {
              gpsLocations.push({
                lat: lat,
                lon: lng,
                timestamp: latestData.timestamp
              });
              console.log(`📍 Added latest GPS location: ${latestData.timestamp} at (${lat}, ${lng}), distance: ${Math.round(distance)}m`);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching latest GPS:', e);
      }
      
      // Find nearest GPS location (use ALL GPS locations, not just recent ones)
      if (gpsLocations.length > 0) {
        let nearest: any = null;
        let minDistance = Infinity;
        
        gpsLocations.forEach((gps: any) => {
          // Use latitude and longitude from server GPS data
          const gpsLat = gps.lat || gps.latitude;
          const gpsLng = gps.lon || gps.longitude;
          if (gpsLat && gpsLng && gps.timestamp) {
            // Calculate distance using server's latitude and longitude
            const distance = getDistanceFromLatLonInMeters(stopLat, stopLng, gpsLat, gpsLng);
            // Use 200 meters threshold - find nearest within this distance
            if (distance < minDistance && distance < 200) {
              minDistance = distance;
              // Return timestamp along with the latitude/longitude used for matching
              nearest = { 
                timestamp: gps.timestamp, 
                distance: distance,
                lat: gpsLat,
                lon: gpsLng
              };
            }
          }
        });
        
        if (nearest) {
          const timestampDate = new Date(nearest.timestamp);
          const hr = timestampDate.getHours();
          const min = timestampDate.getMinutes().toString().padStart(2, '0');
          const ampm = hr >= 12 ? "PM" : "AM";
          const hr12 = hr % 12 || 12;
          const timeStr = `${hr12}:${min} ${ampm}`;
          console.log(`✅ Found nearest GPS for ${stopName} (${routeId}): timestamp=${nearest.timestamp}, lat=${nearest.lat}, lon=${nearest.lon}, time=${timeStr}, distance: ${Math.round(nearest.distance)}m`);
          // Return timestamp, distance, and the lat/lon used from server
          return { timestamp: nearest.timestamp, distance: nearest.distance, lat: nearest.lat, lon: nearest.lon };
        } else {
          console.log(`⚠️ No GPS location found within 200m for ${stopName} (${routeId})`);
        }
      } else {
        console.log(`⚠️ No GPS locations available for ${gpsRouteId}`);
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding nearest GPS for ${stopName}:`, error);
      return null;
    }
  };

  // All expected routes with their stops from route files (including coordinates)
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
        { name: "VIT-AP Campus", lat: 16.4969, lng: 80.4992 } // Alternative name for compatibility
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
        { time: '07:55 AM', stopName: 'ramesh hospital' },
      ]
    },
    'VV7': {
      stops: ['gannavaram bus stand', 'kesarapalli', 'gudavalli', 'nidamanuru', 'enikepadu'],
      schedule: [
        { time: '07:10 AM', stopName: 'gannavaram bus stand' },
        { time: '07:20 AM', stopName: 'kesarapalli' },
        { time: '07:25 AM', stopName: 'gudavalli' },
        { time: '07:30 AM', stopName: 'nidamanuru' },
        { time: '07:35 AM', stopName: 'enikepadu' },
      ]
    },
    'VV8': {
      stops: ['enikepadu', 'prasadampadu', 'ramavarapadu ring', 'currency nagar'],
      schedule: [
        { time: '07:20 AM', stopName: 'enikepadu' },
        { time: '07:25 AM', stopName: 'prasadampadu' },
        { time: '07:40 AM', stopName: 'ramavarapadu ring' },
        { time: '07:42 AM', stopName: 'currency nagar' },
      ]
    },
    'VV9': {
      stops: ['ramavarapadu ring- govt', 'govt hospital', 'novotel', 'McDonalds', 'maris stella college', ' screw bridge', 'balagi nagar', 'varadhi bus stop'],
      schedule: [
        { time: '07:40 AM', stopName: 'ramavarapadu ring- govt' },
        { time: '07:40 AM', stopName: 'govt hospital' },
        { time: '07:42 AM', stopName: 'novotel' },
        { time: '07:45 AM', stopName: 'McDonalds' },
        { time: '07:52 AM', stopName: 'maris stella college' },
        { time: '07:55 AM', stopName: ' screw bridge' },
        { time: '07:59 AM', stopName: 'balagi nagar' },
      ]
    },
    'VV10': {
      stops: ['nunna center', 'sub station', 'kandrika petrol pump', 'payakapuram', 'prakash nagar', 'pipula road', 'singh nagar', 'debakotlu center'],
      schedule: [
        { time: '07:30 AM', stopName: 'nunna center' },
        { time: '07:40 AM', stopName: 'sub station' },
        { time: '07:45 AM', stopName: 'kandrika petrol pump' },
        { time: '07:50 AM', stopName: 'payakapuram' },
        { time: '07:52 AM', stopName: 'prakash nagar' },
        { time: '07:55 AM', stopName: 'pipula road' },
        { time: '07:58 AM', stopName: 'singh nagar' },
        { time: '08:00 AM', stopName: 'debakotlu center' },
      ]
    },
    'GV1': {
      stops: ['lodge center', 'arundalpeta', 'sankar vilas', 'naaz center', 'market -guntur', 'chandana bros', 'bus stand -guntur'],
      schedule: [
        { time: '07:20 AM', stopName: 'lodge center' },
        { time: '07:23 AM', stopName: 'arundalpeta' },
        { time: '07:30 AM', stopName: 'sankar vilas' },
        { time: '07:35 AM', stopName: 'naaz center' },
        { time: '07:40 AM', stopName: 'market -guntur' },
        { time: '07:42 AM', stopName: 'chandana bros' },
        { time: '07:45 AM', stopName: 'bus stand -guntur' },
      ]
    },
    'GV2': {
      stops: ['brahmananda stadium', 'RTC colony', 'manipuram bridge', 'badhra kali amma vari temple', 'barath petrol pump', 'HP petrol pump', 'relaince mart', 'vasavi cloth market', 'mangal das nagar', 'reliance petrol pump'],
      schedule: [
        { time: '07:20 AM', stopName: 'brahmananda stadium' },
        { time: '07:25 AM', stopName: 'RTC colony' },
        { time: '07:30 AM', stopName: 'manipuram bridge' },
        { time: '07:35 AM', stopName: 'badhra kali amma vari temple' },
        { time: '07:40 AM', stopName: 'barath petrol pump' },
        { time: '07:45 AM', stopName: 'HP petrol pump' },
        { time: '07:45 AM', stopName: 'relaince mart' },
        { time: '07:50 AM', stopName: 'vasavi cloth market' },
        { time: '07:55 AM', stopName: 'mangal das nagar' },
        { time: '08:00 AM', stopName: 'reliance petrol pump' },
      ]
    },
    'GV3': {
      stops: ['hanumaiah colony', 'rajendra nagar colony', 'brundavan gardens', 'sitaramaiah high school', 'nayer hostel center'],
      schedule: [
        { time: '07:20 AM', stopName: 'hanumaiah colony' },
        { time: '07:20 AM', stopName: 'rajendra nagar colony' },
        { time: '07:22 AM', stopName: 'brundavan gardens' },
        { time: '07:25 AM', stopName: 'sitaramaiah high school' },
        { time: '07:28 AM', stopName: 'nayer hostel center' },
      ]
    },
    'GV4': {
      stops: ['baker\'s fun center', 'HDFC bank', 'reliance mart', 'hollywood-bollywood', 'amaravathi road', 'chillies'],
      schedule: [
        { time: '07:30 AM', stopName: 'baker\'s fun center' },
        { time: '07:32 AM', stopName: 'HDFC bank' },
        { time: '07:35 AM', stopName: 'reliance mart' },
        { time: '07:37 AM', stopName: 'hollywood-bollywood' },
        { time: '07:40 AM', stopName: 'amaravathi road' },
        { time: '07:45 AM', stopName: 'chillies' },
      ]
    },
    'GV5': {
      stops: ['SVN colony', 'gujjanagundla', 'hanumaiah company', 'sthambala garuvu', 'old RTO office', 'Syamala nagar petrol bunk'],
      schedule: [
        { time: '07:20 AM', stopName: 'SVN colony' },
        { time: '07:21 AM', stopName: 'gujjanagundla' },
        { time: '07:22 AM', stopName: 'hanumaiah company' },
        { time: '07:23 AM', stopName: 'sthambala garuvu' },
        { time: '07:24 AM', stopName: 'old RTO office' },
        { time: '07:25 AM', stopName: 'Syamala nagar petrol bunk' },
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

  // All expected routes from routes page
  const expectedRoutes = [
    { routeId: 'VV1', routeName: 'VV1 Bus Route' },
    { routeId: 'VV2', routeName: 'VV2 Bus Route' },
    { routeId: 'VV3', routeName: 'VV3 Bus Route' },
    { routeId: 'VV4', routeName: 'VV4 Bus Route' },
    { routeId: 'VV5', routeName: 'VV5 Bus Route' },
    { routeId: 'VV6', routeName: 'VV6 Bus Route' },
    { routeId: 'VV7', routeName: 'VV7 Bus Route' },
    { routeId: 'VV8', routeName: 'VV8 Bus Route' },
    { routeId: 'VV9', routeName: 'VV9 Bus Route' },
    { routeId: 'VV10', routeName: 'VV10 Bus Route' },
    { routeId: 'GV1', routeName: 'GV1 Bus Route' },
    { routeId: 'GV2', routeName: 'GV2 Bus Route' },
    { routeId: 'GV3', routeName: 'GV3 Bus Route' },
    { routeId: 'GV4', routeName: 'GV4 Bus Route' },
    { routeId: 'GV5', routeName: 'GV5 Bus Route' },
    { routeId: 'GV6', routeName: 'GV6 Bus Route' },
    { routeId: 'GV7', routeName: 'GV7 Bus Route' },
    { routeId: 'GV8', routeName: 'GV8 Bus Route' },
    { routeId: 'GV9', routeName: 'GV9 Bus Route' },
    { routeId: 'GV10', routeName: 'GV10 Bus Route' },
  ];

  const [availableRoutes, setAvailableRoutes] = useState<Array<{ routeId: string; routeName: string }>>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch available routes from API and merge with expected routes
  const fetchAvailableRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/routes`;
      console.log('Fetching routes from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      let apiRoutes: Array<{ routeId: string; routeName: string }> = [];
      
      if (response.ok) {
        const data = await response.json();
        console.log('Routes API response:', JSON.stringify(data, null, 2));
        
        // Handle success response with routes array
        if (data.success && data.routes && Array.isArray(data.routes)) {
          apiRoutes = data.routes.map((r: any) => {
            const routeId = r.routeId || r._id || '';
            const routeName = r.routeName || r.description || routeId || 'Unknown Route';
            return { routeId: routeId.toUpperCase(), routeName };
          }).filter((r: any) => r.routeId);
        } else if (data.routes && Array.isArray(data.routes)) {
          apiRoutes = data.routes.map((r: any) => {
            const routeId = r.routeId || r._id || '';
            const routeName = r.routeName || r.description || routeId || 'Unknown Route';
            return { routeId: routeId.toUpperCase(), routeName };
          }).filter((r: any) => r.routeId);
        }
      }
      
      // Merge API routes with expected routes
      // Use API route name if available, otherwise use expected route name
      const routeMap = new Map<string, string>();
      apiRoutes.forEach(r => routeMap.set(r.routeId, r.routeName));
      
      const allRoutes = expectedRoutes.map(expected => ({
        routeId: expected.routeId,
        routeName: routeMap.get(expected.routeId) || expected.routeName
      }));
      
      console.log('All routes (expected + API):', allRoutes);
      setAvailableRoutes(allRoutes);
      
    } catch (error) {
      console.error('Error fetching routes:', error);
      // Even if API fails, show expected routes
      setAvailableRoutes(expectedRoutes);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Fetch all routes with stops and arrival timestamps
  const fetchAllRoutesWithStops = async () => {
    if (availableRoutes.length === 0) return;
    
    setLoading(true);
    try {
      const routesWithStops = await Promise.all(
        availableRoutes.map(async (route) => {
          try {
            // Try with uppercase routeId first; include date for historical view
            const routeIdUpper = route.routeId.toUpperCase();
            const dateParam = selectedDate ? `?date=${selectedDate}` : '';
            let response = await fetch(`${API_CONFIG.BASE_URL}/api/routes/${routeIdUpper}/stops-with-arrivals${dateParam}`);
            
            // If 404, try with original case
            if (!response.ok && response.status === 404) {
              response = await fetch(`${API_CONFIG.BASE_URL}/api/routes/${route.routeId}/stops-with-arrivals${dateParam}`);
            }
            
            let stops: StopWithArrival[] = [];
            let arrivalData: any[] = [];
            
            // Try to fetch arrivals for this route (server data for reached time)
            try {
              const todayStr = new Date().toISOString().split('T')[0];
              const useDate = selectedDate && selectedDate !== todayStr ? selectedDate : null;
              const arrivalsUrl = useDate
                ? `${API_CONFIG.BASE_URL}/api/arrivals/route/${routeIdUpper}?date=${useDate}&today=false&limit=100`
                : `${API_CONFIG.BASE_URL}/api/arrivals/route/${route.routeId.toLowerCase()}/today`;
              let arrivalsResponse = await fetch(arrivalsUrl);
              
              if (!arrivalsResponse.ok) {
                arrivalsResponse = await fetch(`${API_CONFIG.BASE_URL}/api/arrivals/route/${routeIdUpper}?today=true&limit=100`);
              }
              
              if (arrivalsResponse.ok) {
                const arrivalsResult = await arrivalsResponse.json();
                if (arrivalsResult.success && arrivalsResult.data) {
                  arrivalData = Array.isArray(arrivalsResult.data) ? arrivalsResult.data : [];
                  console.log(`📥 Fetched ${arrivalData.length} arrivals for route ${route.routeId}`);
                  console.log(`📋 Sample arrival data:`, arrivalData.slice(0, 2).map(a => ({
                    stopName: a.stopName,
                    timestamp: a.arrivalTimestamp
                    // actualTime is NOT used - only GPS server timestamps are used
                  })));
                }
              } else {
                console.warn(`⚠️ Failed to fetch arrivals for ${route.routeId}: ${arrivalsResponse.status}`);
              }
            } catch (err) {
              console.warn(`Could not fetch arrivals for ${route.routeId}:`, err);
            }
            
            // Create arrival map (case-insensitive stop name matching)
            // Keep the latest arrival for each stop (same logic as routes page)
            const arrivalMap: Record<string, any> = {};
            arrivalData.forEach((arrival: any) => {
              const stopKey = (arrival.stopName || '').toLowerCase().trim();
              // Keep the latest arrival for each stop based on arrivalTimestamp
              if (!arrivalMap[stopKey] || 
                  (arrival.arrivalTimestamp && 
                   new Date(arrival.arrivalTimestamp) > new Date(arrivalMap[stopKey].arrivalTimestamp || 0))) {
                arrivalMap[stopKey] = {
                  arrivalTimestamp: arrival.arrivalTimestamp,
                  delay: arrival.delay,
                  status: arrival.status
                  // actualTime is NOT stored - only GPS server timestamps are used
                };
              }
            });
            
            // Fetch GPS coordinates (latitude, longitude) from server for each stop in arrival map
            // First, fetch all GPS locations from server for this route
            const routeIdUpperForGps = route.routeId.toUpperCase();
            const routeToGpsMapForArrival: Record<string, string> = {
              'VV1': 'VV-11',
              'VV2': 'VV-11',
            };
            const gpsRouteIdForArrival = routeToGpsMapForArrival[routeIdUpperForGps] || routeIdUpperForGps;
            
            // Fetch ALL GPS locations from MongoDB server (including ones without stopName)
            let allGpsLocations: any[] = [];
            
            // Fetch ALL GPS locations for this route from MongoDB (with optional date filter)
            try {
              const dateParam = selectedDate ? `?date=${selectedDate}` : '';
              const allLocationsRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/all_locations/${gpsRouteIdForArrival}${dateParam}`);
              if (allLocationsRes.ok) {
                const allLocationsData = await allLocationsRes.json();
                if (Array.isArray(allLocationsData)) {
                  allGpsLocations = allLocationsData.map((gps: any) => ({
                    lat: gps.lat || gps.latitude,
                    lon: gps.lon || gps.longitude,
                    timestamp: gps.timestamp,
                    stopName: gps.stopName || null,
                    route: gps.route
                  })).filter((gps: any) => gps.lat && gps.lon && gps.timestamp);
                  console.log(`📍 Fetched ${allGpsLocations.length} GPS locations from MongoDB for ${gpsRouteIdForArrival}${selectedDate ? ` (date: ${selectedDate})` : ''}`);
                  if (allGpsLocations.length > 0) {
                    console.log(`📍 Sample GPS locations:`, allGpsLocations.slice(0, 5).map(gps => ({
                      lat: gps.lat,
                      lon: gps.lon,
                      timestamp: gps.timestamp,
                      stopName: gps.stopName
                    })));
                  }
                }
              } else {
                console.log(`⚠️ Failed to fetch all GPS locations: ${allLocationsRes.status}`);
              }
            } catch (e) {
              console.log(`⚠️ Could not fetch all GPS locations from MongoDB for ${gpsRouteIdForArrival}:`, e);
            }
            
            // Also fetch latest GPS location as fallback (if no date filter or if we need current location)
            if (!selectedDate || selectedDate === new Date().toISOString().split('T')[0]) {
              try {
                const latestRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${gpsRouteIdForArrival}`);
                if (latestRes.ok) {
                  const latestData = await latestRes.json();
                  if (latestData && latestData.timestamp) {
                    const lat = latestData.latitude || latestData.lat;
                    const lng = latestData.longitude || latestData.lon;
                    if (lat && lng) {
                      // Check if already exists
                      const exists = allGpsLocations.some(gps => 
                        gps.timestamp === latestData.timestamp &&
                        Math.abs(gps.lat - lat) < 0.0001
                      );
                      if (!exists) {
                        allGpsLocations.push({
                          lat: lat,
                          lon: lng,
                          timestamp: latestData.timestamp,
                          stopName: latestData.stopName || null
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('Error fetching latest GPS:', e);
              }
            }
            
            // Match arrival stops with GPS locations from server by comparing coordinates
            // Use historical GPS data, not just latest location
            const arrivalMapWithGps: Array<{stop: string, timestamp: string, lat: number | null, lon: number | null}> = [];
            
            // Get stop coordinates from route files
            const routeStops = routeStopsMap[route.routeId];
            
            Object.keys(arrivalMap).forEach((stopKey) => {
              const arrivalTimestamp = arrivalMap[stopKey].arrivalTimestamp;
              let matchedGps: any = null;
              
              // Strategy 1: Match GPS locations by stopName (if GPS has stopName field)
              if (allGpsLocations.length > 0) {
                const gpsWithStopName = allGpsLocations.filter((gps: any) => 
                  gps.stopName && gps.stopName.toLowerCase().trim() === stopKey.toLowerCase().trim()
                );
                
                if (gpsWithStopName.length > 0) {
                  // If multiple GPS locations with same stopName, prefer one closest to arrival timestamp
                  if (arrivalTimestamp) {
                    const arrivalTime = new Date(arrivalTimestamp).getTime();
                    matchedGps = gpsWithStopName.reduce((best: any, gps: any) => {
                      if (!gps.lat || !gps.lon) return best;
                      const gpsTime = new Date(gps.timestamp).getTime();
                      const timeDiff = Math.abs(arrivalTime - gpsTime);
                      if (!best || timeDiff < Math.abs(arrivalTime - new Date(best.timestamp).getTime())) {
                        return { ...gps, timeDiff };
                      }
                      return best;
                    }, null);
                  } else {
                    // No arrival timestamp, use latest GPS with this stopName
                    matchedGps = gpsWithStopName.reduce((latest: any, gps: any) => {
                      if (!gps.lat || !gps.lon) return latest;
                      if (!latest || new Date(gps.timestamp).getTime() > new Date(latest.timestamp).getTime()) {
                        return gps;
                      }
                      return latest;
                    }, null);
                  }
                  
                  if (matchedGps) {
                    console.log(`✅ Matched stop ${stopKey} by stopName in GPS: lat=${matchedGps.lat}, lon=${matchedGps.lon}, timestamp=${matchedGps.timestamp}`);
                  }
                }
              }
              
              // Strategy 2: Find stop coordinates from route files and match with GPS coordinates
              if (!matchedGps && routeStops && routeStops.stopsCoordinates) {
                const stopCoord = routeStops.stopsCoordinates.find(
                  (coord: any) => coord.name.toLowerCase().trim() === stopKey.toLowerCase().trim()
                );
                
                if (stopCoord && stopCoord.lat && stopCoord.lng) {
                  // Match GPS location from server that matches these coordinates (within 200 meters)
                  matchedGps = allGpsLocations.reduce((bestMatch: any, gps: any) => {
                    if (!gps.lat || !gps.lon) return bestMatch;
                    
                    const distance = getDistanceFromLatLonInMeters(
                      stopCoord.lat, 
                      stopCoord.lng, 
                      gps.lat, 
                      gps.lon
                    );
                    
                    // Match if within 200 meters
                    if (distance < 200) {
                      // Prefer GPS location that matches the arrival timestamp (if available)
                      if (arrivalTimestamp) {
                        const arrivalTime = new Date(arrivalTimestamp).getTime();
                        const gpsTime = new Date(gps.timestamp).getTime();
                        const timeDiff = Math.abs(arrivalTime - gpsTime);
                        
                        // If no best match yet, or this one is closer in time
                        if (!bestMatch || timeDiff < Math.abs(arrivalTime - new Date(bestMatch.timestamp).getTime())) {
                          return { ...gps, distance, timeDiff };
                        }
                      } else {
                        // No timestamp, just use closest by distance
                        if (!bestMatch || distance < bestMatch.distance) {
                          return { ...gps, distance };
                        }
                      }
                    }
                    return bestMatch;
                  }, null);
                  
                  if (matchedGps) {
                    console.log(`✅ Matched stop ${stopKey} by coordinates: lat=${matchedGps.lat}, lon=${matchedGps.lon}, distance=${Math.round(matchedGps.distance)}m, timestamp=${matchedGps.timestamp}`);
                  }
                }
              }
              
              // Strategy 3: Match by timestamp proximity (for stops not in route file)
              if (!matchedGps && arrivalTimestamp && allGpsLocations.length > 0) {
                const arrivalTime = new Date(arrivalTimestamp).getTime();
                let minTimeDiff = Infinity;
                
                allGpsLocations.forEach((gps: any) => {
                  if (!gps.lat || !gps.lon) return;
                  
                  const gpsTime = new Date(gps.timestamp).getTime();
                  const timeDiff = Math.abs(arrivalTime - gpsTime);
                  
                  // Match GPS location within 30 minutes of arrival timestamp
                  if (timeDiff < 30 * 60 * 1000 && timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    matchedGps = gps;
                  }
                });
                
                if (matchedGps) {
                  console.log(`✅ Matched stop ${stopKey} by timestamp: lat=${matchedGps.lat}, lon=${matchedGps.lon}, timestamp=${matchedGps.timestamp}`);
                }
              }
              
              // Strategy 4: Last resort - use latest GPS location (but only if no other match found)
              // This should rarely happen if MongoDB has proper GPS data
              if (!matchedGps && allGpsLocations.length > 0) {
                // Use the GPS location with the latest timestamp
                matchedGps = allGpsLocations.reduce((latest: any, gps: any) => {
                  if (!gps.lat || !gps.lon) return latest;
                  if (!latest || new Date(gps.timestamp).getTime() > new Date(latest.timestamp).getTime()) {
                    return gps;
                  }
                  return latest;
                }, null);
                
                if (matchedGps) {
                  console.log(`⚠️ Using latest GPS for stop ${stopKey} (no exact match found): lat=${matchedGps.lat}, lon=${matchedGps.lon}`);
                }
              }
              
              // Use matched GPS location from server
              if (matchedGps && matchedGps.lat !== undefined && matchedGps.lon !== undefined && matchedGps.lat !== null && matchedGps.lon !== null) {
                arrivalMapWithGps.push({
                  stop: stopKey,
                  timestamp: arrivalTimestamp || matchedGps.timestamp,
                  lat: matchedGps.lat, // Latitude from GPS server
                  lon: matchedGps.lon   // Longitude from GPS server
                });
              } else {
                // No GPS match found - log for debugging
                console.log(`⚠️ No GPS data found for stop ${stopKey}`);
                console.log(`   - Total GPS locations available: ${allGpsLocations.length}`);
                console.log(`   - Arrival timestamp: ${arrivalTimestamp}`);
                if (allGpsLocations.length > 0) {
                  console.log(`   - Available GPS locations:`, allGpsLocations.map(gps => ({
                    lat: gps.lat,
                    lon: gps.lon,
                    timestamp: gps.timestamp
                  })));
                }
                arrivalMapWithGps.push({
                  stop: stopKey,
                  timestamp: arrivalTimestamp || '',
                  lat: null,
                  lon: null
                });
              }
            });
            
            // Create a map of stop coordinates from MongoDB Atlas
            const stopCoordinatesMap: Record<string, { lat: number; lon: number; timestamp: string; date: string; time: string }> = {};
            arrivalMapWithGps.forEach(item => {
              if (item.lat !== null && item.lon !== null && item.timestamp) {
                const timestampDate = new Date(item.timestamp);
                stopCoordinatesMap[item.stop.toLowerCase()] = {
                  lat: item.lat,
                  lon: item.lon,
                  timestamp: item.timestamp,
                  date: timestampDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                  time: timestampDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                };
              }
            });
            
            // Also match ALL stops from routeStops.stopsCoordinates with MongoDB GPS data
            // This ensures we get GPS data for all stops, even if they don't have arrival records
            if (routeStops && routeStops.stopsCoordinates && allGpsLocations.length > 0) {
              routeStops.stopsCoordinates.forEach((stopCoord: any) => {
                const stopKey = stopCoord.name.toLowerCase().trim();
                
                // Skip if already matched from arrivalMap
                if (stopCoordinatesMap[stopKey]) {
                  return;
                }
                
                // Find GPS location from MongoDB that matches these coordinates (within 200 meters)
                const matchedGps = allGpsLocations.reduce((bestMatch: any, gps: any) => {
                  if (!gps.lat || !gps.lon) return bestMatch;
                  
                  const distance = getDistanceFromLatLonInMeters(
                    stopCoord.lat, 
                    stopCoord.lng, 
                    gps.lat, 
                    gps.lon
                  );
                  
                  // Match if within 200 meters
                  if (distance < 200) {
                    // Use the GPS location with the latest timestamp (most recent match)
                    if (!bestMatch || new Date(gps.timestamp).getTime() > new Date(bestMatch.timestamp).getTime()) {
                      return { ...gps, distance };
                    }
                  }
                  return bestMatch;
                }, null);
                
                if (matchedGps) {
                  const timestampDate = new Date(matchedGps.timestamp);
                  stopCoordinatesMap[stopKey] = {
                    lat: matchedGps.lat,
                    lon: matchedGps.lon,
                    timestamp: matchedGps.timestamp,
                    date: timestampDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                    time: timestampDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                  };
                  console.log(`✅ Matched stop ${stopCoord.name} from coordinates list: lat=${matchedGps.lat}, lon=${matchedGps.lon}, distance=${Math.round(matchedGps.distance)}m, timestamp=${matchedGps.timestamp}`);
                }
              });
            }
            
            console.log(`📊 Arrival map for ${route.routeId}:`, arrivalMapWithGps.map(item => ({
              stop: item.stop,
              timestamp: item.timestamp,
              latitude: item.lat !== null ? item.lat : undefined,
              longitude: item.lon !== null ? item.lon : undefined
            })));
            
            console.log(`📍 GPS Coordinates from MongoDB Atlas for ${route.routeId}:`, Object.keys(stopCoordinatesMap).map(key => ({
              stop: key,
              ...stopCoordinatesMap[key]
            })));
            
            if (!response.ok) {
              // If 404, use stops from route files as fallback
              if (response.status === 404) {
                const routeStops = routeStopsMap[route.routeId];
                if (routeStops && routeStops.stops.length > 0) {
                  // Create stops array from route files data and merge with arrival data
                  stops = routeStops.stops.map((stopName, index) => {
                    const scheduleItem = routeStops.schedule.find(s => s.stopName === stopName) || 
                                       routeStops.schedule[index] || 
                                       { time: 'N/A' };
                    const stopKey = stopName.toLowerCase();
                    const arrival = arrivalMap[stopKey];
                    
                    // Get GPS coordinates from MongoDB Atlas if available
                    const gpsCoords = stopCoordinatesMap[stopKey];
                    const gpsTimestamp = gpsCoords?.timestamp || (arrival ? arrival.arrivalTimestamp : null);
                    
                return {
                      name: stopName,
                      scheduledTime: scheduleItem.time || 'N/A',
                      location: { lat: 0, lon: 0 },
                      isActive: true,
                      actualTime: null, // Not used - only GPS server timestamps are used
                      arrivalTimestamp: gpsTimestamp,
                      delay: arrival ? arrival.delay : null,
                      status: arrival ? arrival.status : ('pending' as const),
                      // Add GPS coordinates, timestamp, date, and time from MongoDB Atlas
                      gpsLocation: gpsCoords ? {
                        lat: gpsCoords.lat,
                        lon: gpsCoords.lon,
                        timestamp: gpsCoords.timestamp,
                        date: gpsCoords.date,
                        time: gpsCoords.time
                      } : null
                    };
                  });
                  
                  console.log(`✅ Using stops from routeStopsMap for ${route.routeId}: ${stops.length} stops`);
                  
                  return {
                    routeId: route.routeId,
                    routeName: route.routeName,
                    stops: stops,
                    totalStops: stops.length,
                    completedStops: stops.filter(s => s.arrivalTimestamp !== null).length
                  };
                }
                // No stops defined in route files either
                console.warn(`⚠️ No stops found in routeStopsMap for ${route.routeId}`);
                return {
                  routeId: route.routeId,
                  routeName: route.routeName,
                  stops: [],
                  totalStops: 0,
                  completedStops: 0
                };
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.stops && data.stops.length > 0) {
              // Use server data as primary: routes, bus stop coordinates, and reached time from backend
              stops = data.stops.map((stop: any) => {
                const stopKey = (stop.name || '').toLowerCase().trim();
                const arrival = arrivalMap[stopKey];
                const gpsCoords = stopCoordinatesMap[stopKey];
                
                // Coordinates: Prioritize server stop.location, fallback to GPS server
                const hasServerCoords = stop.location && (stop.location.lat || stop.location.lon);
                const coords = hasServerCoords 
                  ? { lat: stop.location.lat ?? 0, lon: stop.location.lon ?? stop.location.lng ?? 0 }
                  : (gpsCoords ? { lat: gpsCoords.lat, lon: gpsCoords.lon } : null);
                
                // Reached time: Prioritize server actualTime/arrivalTimestamp, fallback to GPS server
                const serverArrivalTs = stop.arrivalTimestamp || (arrival?.arrivalTimestamp);
                const serverActualTime = stop.actualTime || (arrival ? null : null);
                const gpsTimestamp = gpsCoords?.timestamp;
                const finalArrivalTimestamp = serverArrivalTs || gpsTimestamp;
                const formatTs = (ts: string | Date) => {
                  try {
                    const d = new Date(ts);
                    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  } catch { return null; }
                };
                const finalActualTime = serverActualTime ?? (arrival?.arrivalTimestamp ? formatTs(arrival.arrivalTimestamp) : null) ?? gpsCoords?.time ?? null;
                
                return {
                  ...stop,
                  location: coords || stop.location || { lat: 0, lon: 0 },
                  actualTime: finalActualTime,
                  arrivalTimestamp: finalArrivalTimestamp,
                  delay: arrival && arrival.delay !== undefined ? arrival.delay : (stop.delay ?? null),
                  status: arrival ? arrival.status : (stop.status || 'pending'),
                  gpsLocation: coords && (gpsCoords?.timestamp || finalArrivalTimestamp) ? {
                    lat: coords.lat,
                    lon: coords.lon,
                    timestamp: gpsCoords?.timestamp || finalArrivalTimestamp,
                    date: gpsCoords?.date || (finalArrivalTimestamp ? new Date(finalArrivalTimestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''),
                    time: gpsCoords?.time || (finalArrivalTimestamp ? new Date(finalArrivalTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '')
                  } : null
                };
              });
              
              return {
                routeId: data.routeId || route.routeId,
                routeName: data.routeName || route.routeName,
                stops: stops,
                totalStops: data.totalStops || stops.length,
                completedStops: stops.filter(s => s.arrivalTimestamp !== null).length
              };
            } else {
              // Route exists but has no stops in DB - use stops from route files
              const routeStops = routeStopsMap[route.routeId];
              if (routeStops && routeStops.stops.length > 0) {
                stops = routeStops.stops.map((stopName, index) => {
                  const scheduleItem = routeStops.schedule.find(s => s.stopName === stopName) || 
                                     routeStops.schedule[index] || 
                                     { time: 'N/A' };
                  const stopKey = stopName.toLowerCase();
                  const arrival = arrivalMap[stopKey];
                  
                  // Get GPS coordinates from MongoDB Atlas if available
                  const gpsCoords = stopCoordinatesMap[stopKey];
                  const gpsTimestamp = gpsCoords?.timestamp || (arrival ? arrival.arrivalTimestamp : null);
                  
                  return {
                    name: stopName,
                    scheduledTime: scheduleItem.time || 'N/A',
                    location: { lat: 0, lon: 0 },
                    isActive: true,
                    actualTime: null, // Not used - only GPS server timestamps are used
                    arrivalTimestamp: gpsTimestamp,
                    delay: arrival ? arrival.delay : null,
                    status: arrival ? arrival.status : ('pending' as const),
                    // Add GPS coordinates, timestamp, date, and time from MongoDB Atlas
                    gpsLocation: gpsCoords ? {
                      lat: gpsCoords.lat,
                      lon: gpsCoords.lon,
                      timestamp: gpsCoords.timestamp,
                      date: gpsCoords.date,
                      time: gpsCoords.time
                    } : null
                  };
                });
                
                return {
                  routeId: route.routeId,
                  routeName: route.routeName,
                  stops: stops,
                  totalStops: stops.length,
                  completedStops: stops.filter(s => s.arrivalTimestamp !== null).length
                };
              }
              // No stops available
              return {
                routeId: route.routeId,
                routeName: route.routeName,
                stops: [],
                totalStops: 0,
                completedStops: 0
              };
            }
            } catch (error) {
            // Only log non-404 errors (404 means route doesn't exist or has no stops - that's OK)
            if (error instanceof Error && !error.message.includes('404')) {
              console.error(`Error fetching stops for route ${route.routeId}:`, error);
            }
            
            // Even on error, try to use stops from routeStopsMap as fallback
            const routeStops = routeStopsMap[route.routeId];
            if (routeStops && routeStops.stops.length > 0) {
              console.log(`⚠️ API error for ${route.routeId}, using stops from routeStopsMap: ${routeStops.stops.length} stops`);
              
              // Create empty arrivalMap and stopCoordinatesMap for fallback (no API data available)
              const fallbackArrivalMap: Record<string, any> = {};
              const fallbackStopCoordinatesMap: Record<string, { lat: number; lon: number; timestamp: string; date: string; time: string }> = {};
              
              const stops = routeStops.stops.map((stopName, index) => {
                const scheduleItem = routeStops.schedule.find(s => s.stopName === stopName) || 
                                   routeStops.schedule[index] || 
                                   { time: 'N/A' };
                const stopKey = stopName.toLowerCase();
                const arrival = fallbackArrivalMap[stopKey];
                
                // Get GPS coordinates from MongoDB Atlas if available (will be empty in catch block, but structure is correct)
                const gpsCoords = fallbackStopCoordinatesMap[stopKey];
                const gpsTimestamp = gpsCoords?.timestamp || (arrival ? arrival.arrivalTimestamp : null);
                
                return {
                  name: stopName,
                  scheduledTime: scheduleItem.time || 'N/A',
                  location: { lat: 0, lon: 0 },
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
              
              return {
                routeId: route.routeId,
                routeName: route.routeName,
                stops: stops,
                totalStops: stops.length,
                completedStops: stops.filter(s => s.arrivalTimestamp !== null).length
              };
            }
            
            // Return route with empty stops instead of failing completely
            console.warn(`⚠️ No stops available for route ${route.routeId} (no routeStopsMap entry)`);
            return {
              routeId: route.routeId,
              routeName: route.routeName,
              stops: [],
              totalStops: 0,
              completedStops: 0
            };
          }
        })
      );
      
      // Sort routes: GV routes first (GV1-GV10), then VV routes (VV1-VV10)
      const sortedRoutes = routesWithStops.sort((a, b) => {
        const aId = a.routeId.toUpperCase();
        const bId = b.routeId.toUpperCase();
        
        // Check if GV or VV
        const aIsGV = aId.startsWith('GV');
        const bIsGV = bId.startsWith('GV');
        
        if (aIsGV && !bIsGV) return -1;
        if (!aIsGV && bIsGV) return 1;
        
        // Extract numbers
        const aNum = parseInt(aId.replace(/[^0-9]/g, '')) || 0;
        const bNum = parseInt(bId.replace(/[^0-9]/g, '')) || 0;
        
        return aNum - bNum;
      });
      
      setRoutes(sortedRoutes);
      
      // Check tracker status for all routes after fetching routes
      checkAllTrackerStatuses();
    } catch (error) {
      console.error('Error fetching routes with stops:', error);
      Alert.alert('Error', 'Failed to fetch routes data');
    } finally {
      setLoading(false);
    }
  };

  // Refetch routes when date changes
  useEffect(() => {
    if (availableRoutes.length > 0) {
      fetchAllRoutesWithStops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Check if tracker is online for a route by checking GPS location freshness
  const checkTrackerStatus = async (routeId: string): Promise<boolean> => {
    try {
      // Map route IDs to GPS route format (e.g., VV1 -> VV-11, VV2 -> VV-11, etc.)
      // For now, we'll use the route ID directly or try common bus numbers
      const routeIdUpper = routeId.toUpperCase();
      let gpsRouteId = routeIdUpper;
      
      // Map specific routes to their GPS route identifiers if needed
      const routeToGpsMap: Record<string, string> = {
        'VV1': 'VV-11', // VV1 uses VV-11 GPS endpoint
        'VV2': 'VV-11',
        // Add more mappings as needed
      };
      
      if (routeToGpsMap[routeIdUpper]) {
        gpsRouteId = routeToGpsMap[routeIdUpper];
      }
      
      const res = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${gpsRouteId}`);
      
      if (!res.ok) {
        return false;
      }
      
      const data = await res.json();
      // GPS API returns 'latitude', 'longitude', and 'timestamp'
      if (!data || (!data.latitude && !data.lat) || (!data.longitude && !data.lon)) {
        return false;
      }

      // Use the timestamp from the GPS API server to determine if tracker is live
      const gpsTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : null;
      const now = Date.now();
      const isRecent = gpsTimestamp ? (now - gpsTimestamp) < 5 * 60 * 1000 : false; // 5 minutes threshold
      
      if (gpsTimestamp && !isRecent) {
        const minutesOld = Math.round((now - gpsTimestamp) / 1000 / 60);
        console.log(`⚠️ Route ${routeId}: GPS timestamp is ${minutesOld} minutes old (${data.timestamp}) - tracker offline`);
      } else if (gpsTimestamp && isRecent) {
        const secondsAgo = Math.round((now - gpsTimestamp) / 1000);
        console.log(`✅ Route ${routeId}: GPS timestamp is recent (${secondsAgo} seconds ago, ${data.timestamp}) - tracker online`);
      }
      
      return isRecent;
    } catch (error) {
      console.error(`Error checking tracker status for ${routeId}:`, error);
      return false;
    }
  };

  // Check tracker status for all routes
  const checkAllTrackerStatuses = async () => {
    if (availableRoutes.length === 0) return;
    
    const statuses: Record<string, boolean> = {};
    await Promise.all(
      availableRoutes.map(async (route) => {
        const isOnline = await checkTrackerStatus(route.routeId);
        statuses[route.routeId] = isOnline;
      })
    );
    setTrackerStatus(statuses);
    console.log('📊 Tracker statuses updated:', statuses);
  };

  // Check if arrival is LIVE (within last 5 minutes)
  const isArrivalLive = (arrivalTimestamp: string | null): boolean => {
    if (!arrivalTimestamp) return false;
    const arrivalTime = new Date(arrivalTimestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - arrivalTime.getTime()) / (1000 * 60);
    return diffInMinutes <= 5 && diffInMinutes >= 0;
  };

  // Format time in local timezone
  const formatLocalTime = (timestamp: string | null): string => {
    if (!timestamp) return 'No arrival yet';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Setup socket connection for all routes
  useEffect(() => {
    if (availableRoutes.length === 0) return;

    // Setup WebSocket connection
    // For React Native, use the same URL as API - socket.io will handle protocol
    const socketUrl = API_CONFIG.BASE_URL;
    
    console.log('🔌 Connecting to socket server:', socketUrl);

    const socketConnection = io(socketUrl, {
      // Try polling first for React Native compatibility, then upgrade to websocket
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      path: '/socket.io/',
      timeout: 20000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: false,
    });
    
    // Set initial connection state
    if (socketConnection.connected) {
      console.log('✅ Socket already connected');
      setSocketConnected(true);
    }

    socketRef.current = socketConnection;
    setSocket(socketConnection);

    // Join all route rooms immediately (even if not connected yet, socket.io will queue)
    availableRoutes.forEach(route => {
      const routeIdUpper = route.routeId.toUpperCase();
      socketConnection.emit('join-route', routeIdUpper);
      console.log(`📍 Joining route room: route-${routeIdUpper}`);
    });

    // Handle connection
    socketConnection.on('connect', () => {
      console.log('✅ WebSocket connected');
      console.log(`🔌 Socket ID: ${socketConnection.id}`);
      setSocketConnected(true);
      
      // Rejoin all route rooms after reconnection
      availableRoutes.forEach(route => {
        const routeIdUpper = route.routeId.toUpperCase();
        socketConnection.emit('join-route', routeIdUpper);
        console.log(`📍 Rejoined route room: route-${routeIdUpper}`);
      });
    });

    socketConnection.on('connect_error', (error: any) => {
      // Suppress verbose error logging - socket connection failures are expected in some environments
      const errorMsg = error?.message || error?.toString() || 'Connection failed';
      if (!errorMsg.includes('xhr poll error')) {
        // Only log non-polling errors to reduce noise
        console.warn('⚠️ Socket connection issue:', errorMsg);
      }
      setSocketConnected(false);
      
      // Don't show alert - the app can work without real-time updates
      // Arrivals will still be fetched via API polling
    });
    
    // Listen for reconnection attempts
    socketConnection.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });
    
    socketConnection.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setSocketConnected(true);
      
      // Rejoin all route rooms after reconnection
      availableRoutes.forEach(route => {
        const routeIdUpper = route.routeId.toUpperCase();
        socketConnection.emit('join-route', routeIdUpper);
        console.log(`📍 Rejoined route room after reconnect: route-${routeIdUpper}`);
      });
    });
    
    socketConnection.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message || error);
    });
    
    socketConnection.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed - giving up');
      setSocketConnected(false);
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setSocketConnected(false);
    });

    // Listen for route join confirmation
    socketConnection.on('route-joined', (data: any) => {
      console.log(`✅ Confirmed joined route room: ${data.room} (routeId: ${data.routeId})`);
    });

    // Listen for arrival updates
    socketConnection.on('arrival-update', (data: any) => {
      console.log('📢 Received arrival update:', JSON.stringify(data, null, 2));
      console.log(`🔍 Looking for route: ${data.routeId}, stop: ${data.stopName}`);
      
      // Update the stop with new arrival timestamp
      setRoutes(prev => {
        console.log(`📋 Current routes:`, prev.map(r => ({ routeId: r.routeId, stops: r.stops.map(s => s.name) })));
        
        const updated = prev.map(route => {
          // Case-insensitive routeId comparison
          const routeIdMatch = route.routeId.toUpperCase() === (data.routeId || '').toUpperCase();
          
          if (routeIdMatch) {
            console.log(`✅ Route matched: ${route.routeId} === ${data.routeId}`);
            console.log(`📍 Route stops:`, route.stops.map(s => s.name));
            
            const updatedStops = route.stops.map(stop => {
              // Case-insensitive stop name comparison
              const stopNameMatch = stop.name.toLowerCase().trim() === (data.stopName || '').toLowerCase().trim();
              
              if (stopNameMatch) {
                console.log(`✅ Stop matched: "${stop.name}" === "${data.stopName}"`);
                console.log(`📝 Updating stop with timestamp: ${data.arrivalTimestamp}`);
                
                // Ensure arrivalTimestamp is properly formatted
                // NOTE: actualTime is NOT used - only GPS server timestamps are used
                let arrivalTimestamp = data.arrivalTimestamp;
                if (arrivalTimestamp) {
                  if (typeof arrivalTimestamp === 'string') {
                    try {
                      arrivalTimestamp = new Date(arrivalTimestamp).toISOString();
                    } catch (e) {
                      console.error('Error parsing timestamp:', e);
                    }
                  } else if (arrivalTimestamp instanceof Date) {
                    arrivalTimestamp = arrivalTimestamp.toISOString();
                  }
                }
                
                const updatedStop = {
                  ...stop,
                  actualTime: null, // Not used - only GPS server timestamps are used
                  arrivalTimestamp: arrivalTimestamp || stop.arrivalTimestamp,
                  delay: data.delay !== undefined ? data.delay : stop.delay,
                  status: data.status || stop.status || 'pending'
                };
                
                console.log(`🔄 Updated stop: ${updatedStop.name}`);
                console.log(`   - arrivalTimestamp: ${updatedStop.arrivalTimestamp}`);
                console.log(`   - Previous timestamp: ${stop.arrivalTimestamp}`);
                
                return updatedStop;
              } else {
                // Log when stop names don't match for debugging
                console.log(`❌ Stop name mismatch: "${stop.name}" !== "${data.stopName}"`);
              }
              return stop;
            });
            
            const hasUpdates = updatedStops.some((stop, idx) => {
              const originalStop = route.stops[idx];
              return stop.arrivalTimestamp !== originalStop.arrivalTimestamp;
            });
            
            if (hasUpdates) {
              console.log('🔄 Route state updated with new arrival data');
            } else {
              console.log('⚠️ No updates detected in route state');
            }
            
            return {
              ...route,
              stops: updatedStops,
              completedStops: updatedStops.filter(s => s.arrivalTimestamp !== null).length
            };
          }
          return route;
        });
        
        const routesWithUpdates = updated.filter((r, idx) => {
          const original = prev[idx];
          return r.stops.some((stop, stopIdx) => {
            const originalStop = original.stops[stopIdx];
            return stop.arrivalTimestamp !== originalStop.arrivalTimestamp;
          });
        });
        
        if (routesWithUpdates.length > 0) {
          console.log('📊 Routes updated:', routesWithUpdates.map(r => ({
            routeId: r.routeId,
            stopsWithArrivals: r.stops.filter(s => s.arrivalTimestamp !== null).length,
            updatedStops: r.stops.filter((s, idx) => {
              const orig = prev.find(pr => pr.routeId === r.routeId)?.stops[idx];
              return orig && (s.arrivalTimestamp !== orig.arrivalTimestamp);
            }).map(s => s.name)
          })));
        } else {
          console.log('⚠️ No routes were updated - check routeId and stopName matching');
        }
        
        // Force return new array reference to ensure React detects the change
        return [...updated];
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketConnection) {
        availableRoutes.forEach(route => {
          socketConnection.emit('leave-route', route.routeId.toUpperCase());
        });
        socketConnection.removeAllListeners();
        socketConnection.disconnect();
        console.log('🔌 Socket disconnected and cleaned up');
      }
    };
  }, [availableRoutes]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      await fetchAllRoutesWithStops();
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      Alert.alert('Error', 'Failed to refresh arrival data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 12 hours
  useEffect(() => {
    if (routes.length > 0) {
      // 12 hours = 12 * 60 * 60 * 1000 milliseconds
      const twelveHours = 12 * 60 * 60 * 1000;
      
      const autoRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing arrival data (12-hour interval)');
        setLoading(true);
        try {
          await fetchAllRoutesWithStops();
          console.log('✅ Auto-refresh completed');
        } catch (error) {
          console.error('❌ Auto-refresh failed:', error);
        } finally {
          setLoading(false);
        }
      }, twelveHours);

      console.log('⏰ Auto-refresh scheduled: every 12 hours');

      return () => {
        clearInterval(autoRefreshInterval);
        console.log('⏰ Auto-refresh interval cleared');
      };
    }
  }, [routes.length]);

  // Periodically check tracker status (every 30 seconds)
  useEffect(() => {
    if (availableRoutes.length > 0) {
      // Check immediately
      checkAllTrackerStatuses();
      
      // Then check every 30 seconds
      const trackerCheckInterval = setInterval(() => {
        console.log('🔄 Checking tracker status for all routes');
        checkAllTrackerStatuses();
      }, 30000); // 30 seconds

      return () => {
        clearInterval(trackerCheckInterval);
      };
    }
  }, [availableRoutes.length]);

  // Update GPS timestamps from nearest coordinates for all routes
  useEffect(() => {
    if (routes.length === 0) return;

    const updateGpsTimestamps = async () => {
      const updates: Record<string, Record<string, { timestamp: string; time: string }>> = {};
      const today = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === today;
      
      await Promise.all(
        routes.map(async (route) => {
          const trackerIsOnline = trackerStatus[route.routeId] ?? false;
          
          // Only fetch GPS timestamps if tracker is online (for today) or viewing historical date
          if (isToday && !trackerIsOnline) {
            // Tracker is offline for today - clear GPS timestamps
            updates[route.routeId] = {};
            return;
          }
          
          // Get route GPS ID
          const routeIdUpper = route.routeId.toUpperCase();
          const routeToGpsMap: Record<string, string> = {
            'VV1': 'VV-11',
            'VV2': 'VV-11',
          };
          const gpsRouteId = routeToGpsMap[routeIdUpper] || routeIdUpper;
          
          // Fetch all GPS locations from server
          let allGpsLocations: any[] = [];
          try {
            // Fetch GPS history from server
            const historyRes = await fetch(`https://git-backend-1-production.up.railway.app/api/stops/route/${gpsRouteId}/history`);
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              if (Array.isArray(historyData)) {
                allGpsLocations = historyData.map((gps: any) => ({
                  lat: gps.lat || gps.latitude,
                  lon: gps.lon || gps.longitude,
                  timestamp: gps.timestamp
                })).filter((gps: any) => gps.lat && gps.lon && gps.timestamp);
                console.log(`📍 Fetched ${allGpsLocations.length} GPS locations from server for ${gpsRouteId}`);
              }
            }
          } catch (e) {
            console.log(`⚠️ Could not fetch GPS history for ${gpsRouteId}`);
          }
          
          // Also fetch latest GPS location
          try {
            const latestRes = await fetch(`https://git-backend-1-production.up.railway.app/api/gps/latest_location/${gpsRouteId}`);
            if (latestRes.ok) {
              const latestData = await latestRes.json();
              if (latestData && latestData.timestamp) {
                const lat = latestData.latitude || latestData.lat;
                const lng = latestData.longitude || latestData.lon;
                if (lat && lng) {
                  const exists = allGpsLocations.some(gps => 
                    gps.timestamp === latestData.timestamp &&
                    Math.abs(gps.lat - lat) < 0.0001
                  );
                  if (!exists) {
                    allGpsLocations.push({
                      lat: lat,
                      lon: lng,
                      timestamp: latestData.timestamp
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error fetching latest GPS:', e);
          }
          
          // Get stop coordinates from route files
          const routeStops = routeStopsMap[route.routeId];
          const routeUpdates: Record<string, { timestamp: string; time: string }> = {};
          
          await Promise.all(
            route.stops.map(async (stop) => {
              // Get stop coordinates from route files (priority) or stop.location
              let stopLat = stop.location?.lat;
              let stopLng = stop.location?.lon;
              
              // If stop doesn't have coordinates, try to get from routeStopsMap
              if ((!stopLat || !stopLng) && routeStops && routeStops.stopsCoordinates) {
                const stopCoord = routeStops.stopsCoordinates.find(
                  (coord: any) => coord.name.toLowerCase().trim() === stop.name.toLowerCase().trim()
                );
                if (stopCoord) {
                  stopLat = stopCoord.lat;
                  stopLng = stopCoord.lng;
                }
              }
              
              if (stopLat && stopLng && allGpsLocations.length > 0) {
                // Find GPS location from server that matches these coordinates (within 200 meters)
                const matchedGps = allGpsLocations.reduce((bestMatch: any, gps: any) => {
                  if (!gps.lat || !gps.lon) return bestMatch;
                  
                  const distance = getDistanceFromLatLonInMeters(stopLat!, stopLng!, gps.lat, gps.lon);
                  
                  // Match if within 200 meters
                  if (distance < 200) {
                    // Use the GPS location with the latest timestamp (most recent match)
                    if (!bestMatch || new Date(gps.timestamp).getTime() > new Date(bestMatch.timestamp).getTime()) {
                      return { ...gps, distance };
                    }
                  }
                  return bestMatch;
                }, null);
                
                if (matchedGps && matchedGps.timestamp) {
                  // Check if GPS timestamp is recent (within 5 minutes) when tracker is online
                  const gpsTimestamp = new Date(matchedGps.timestamp).getTime();
                  const now = Date.now();
                  const isRecent = (now - gpsTimestamp) < 5 * 60 * 1000; // 5 minutes
                  
                  // For today: Only use GPS timestamp if it's recent AND tracker is online
                  // For historical dates: Use GPS timestamp regardless
                  if (isToday && trackerIsOnline && !isRecent) {
                    // Tracker is online but GPS data is old - don't use it
                    console.log(`⚠️ GPS timestamp for ${stop.name} is too old (${Math.round((now - gpsTimestamp) / 1000 / 60)} minutes), ignoring`);
                    return;
                  }
                  
                  // Format timestamp from GPS server
                  const gpsDate = new Date(matchedGps.timestamp);
                  const hr = gpsDate.getHours();
                  const min = gpsDate.getMinutes().toString().padStart(2, '0');
                  const ampm = hr >= 12 ? "PM" : "AM";
                  const hr12 = hr % 12 || 12;
                  const time = `${hr12}:${min} ${ampm}`;
                  
                  routeUpdates[stop.name] = {
                    timestamp: matchedGps.timestamp, // Use timestamp from GPS server when coordinates match
                    time: time
                  };
                  
                  console.log(`✅ Matched stop ${stop.name} coordinates with GPS server: lat=${matchedGps.lat}, lon=${matchedGps.lon}, timestamp=${matchedGps.timestamp}, distance=${Math.round(matchedGps.distance)}m`);
                }
              }
            })
          );
          
          if (Object.keys(routeUpdates).length > 0) {
            updates[route.routeId] = routeUpdates;
          }
        })
      );
      
      // Update GPS timestamps (clear if tracker offline for today)
      setGpsTimestamps((prev: Record<string, Record<string, { timestamp: string; time: string }>>) => {
        const merged = { ...prev };
        Object.keys(updates).forEach(routeId => {
          if (Object.keys(updates[routeId]).length === 0) {
            // Clear timestamps for this route (tracker offline)
            delete merged[routeId];
          } else {
            merged[routeId] = { ...merged[routeId], ...updates[routeId] };
          }
        });
        return merged;
      });
    };

    updateGpsTimestamps();
    // Update every 30 seconds
    const interval = setInterval(updateGpsTimestamps, 30000);
    return () => clearInterval(interval);
  }, [routes, trackerStatus, selectedDate]);

  // Fetch routes on component mount
  useEffect(() => {
    fetchAvailableRoutes();
  }, []);

  // Fetch stops when routes are loaded
  useEffect(() => {
    if (availableRoutes.length > 0) {
      fetchAllRoutesWithStops();
    }
  }, [availableRoutes]);

  const getStatusColor = (status: string) => {
    const theme = colors[isDark ? 'dark' : 'light'];
    switch (status) {
      case 'on_time': return '#10B981';
      case 'delayed': return '#EF4444';
      case 'early': return theme.accent;
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_time': return 'On Time';
      case 'delayed': return 'Delayed';
      case 'early': return 'Early';
      default: return 'Unknown';
    }
  };


  const styles = getStyles(isDark);
  const theme = colors[isDark ? 'dark' : 'light'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.primary} />

      {/* Ombre Header */}
      <LinearGradient
        colors={theme.gradientOmbreHeader || theme.gradientOmbre}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Live Arrival Dashboard</Text>
            <Text style={styles.headerSubtitle}>Real-time bus arrival tracking</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton} 
            onPress={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar and Date Picker */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
          <Search size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            <TextInput
              style={styles.searchInput}
            placeholder="Search routes..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
          )}
        </View>
        
        {/* Date Picker */}
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={18} color={theme.primary} />
          <Text style={styles.datePickerText}>
            {selectedDate === new Date().toISOString().split('T')[0] 
              ? 'Today' 
              : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <X size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={[styles.dateLabel, { color: isDark ? '#CBD5E1' : '#64748B' }]}>Date:</Text>
                <TextInput
                  style={[styles.dateInput, { 
                    backgroundColor: isDark ? '#334155' : '#F1F5F9',
                    color: isDark ? '#FFFFFF' : '#1E293B'
                  }]}
                  value={selectedDate}
                  onChangeText={(text) => setSelectedDate(text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                <Text style={[styles.dateHint, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Format: YYYY-MM-DD (e.g., 2025-12-12)
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.modalButtonTextSecondary}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      {/* All Routes with Stops */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loadingRoutes ? (
            <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
        ) : routes.length === 0 ? (
            <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No routes available</Text>
            <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, opacity: 0.7 }]}>
              Make sure routes are created in the database
            </Text>
            </View>
          ) : (
          routes
            .filter(route => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return route.routeId.toLowerCase().includes(query) ||
                     route.routeName.toLowerCase().includes(query) ||
                     route.stops.some(stop => stop.name.toLowerCase().includes(query));
            })
            .map((route) => (
              <View key={route.routeId} style={styles.routeSection}>
                {/* Route Header */}
                <View style={styles.routeHeader}>
                  <View style={styles.routeHeaderLeft}>
                    <Bus size={20} color={theme.primary} />
                    <View style={styles.routeHeaderText}>
                      <Text style={styles.routeId}>{route.routeId.toUpperCase()}</Text>
                      <Text style={styles.routeDescription}>
                        {route.stops.length > 0 
                          ? `${route.stops[0]?.name || ''} to ${route.stops[route.stops.length - 1]?.name || ''}`
                          : route.routeName}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusIndicator, socketConnected ? styles.statusIndicatorLive : styles.statusIndicatorOffline]}>
                    <View style={[styles.statusDot, socketConnected && styles.statusDotLive]} />
                    <Text style={styles.statusText}>
                      {socketConnected ? 'LIVE' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                {/* Stops Table */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading stops...</Text>
                  </View>
                ) : route.stops.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No stops configured</Text>
                      </View>
                ) : (
                  <View style={styles.stopsTable}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>STOP</Text>
                      <Text style={styles.tableHeaderText}>SCHEDULED</Text>
                      <Text style={styles.tableHeaderText}>ACTUAL</Text>
                    </View>
                    
                    {/* Table Rows */}
                    {route.stops.map((stop, index) => {
                      const isLive = stop.arrivalTimestamp && isArrivalLive(stop.arrivalTimestamp);
                      const trackerIsOnline = trackerStatus[route.routeId] ?? false;
                      
                      // Check if viewing today or historical date
                      const today = new Date().toISOString().split('T')[0];
                      const isToday = selectedDate === today;
                      
                      // Get GPS timestamp if available (from nearest GPS coordinate)
                      const gpsData = gpsTimestamps[route.routeId]?.[stop.name];
                      
                      // Show reached/arrival time - prioritize server data (routes, coordinates, reached time from backend)
                      // Priority: Server actualTime/arrivalTimestamp > GPS time from MongoDB > gpsData
                      let displayTime = '-';
                      
                      // Priority 1: Server's actualTime or arrivalTimestamp (from backend Arrival records)
                      if (stop.actualTime) {
                        displayTime = stop.actualTime;
                      } else if (stop.arrivalTimestamp) {
                        try {
                          displayTime = formatLocalTime(stop.arrivalTimestamp);
                        } catch (e) {
                          displayTime = '-';
                        }
                      }
                      // Priority 2: GPS time from MongoDB Atlas (stop.gpsLocation.time)
                      else if (stop.gpsLocation?.time) {
                        displayTime = stop.gpsLocation.time;
                      }
                      // Priority 3: GPS timestamp from external GPS server (gpsData.time)
                      else if (gpsData?.time && (!isToday || trackerIsOnline)) {
                        displayTime = gpsData.time;
                      }
                      
                      // Debug log for stops
                      console.log(`📍 Route ${route.routeId} - Stop ${stop.name}: displayTime=${displayTime}, gpsLocation.time=${stop.gpsLocation?.time}, gpsData.time=${gpsData?.time}, arrivalTimestamp=${stop.arrivalTimestamp}, trackerOnline=${trackerIsOnline}, isToday=${isToday}`);
                      
                      return (
                        <View key={index} style={[
                          styles.stopRow,
                          index === route.stops.length - 1 && styles.stopRowLast
                        ]}>
                          <View style={styles.stopCell}>
                            <MapPin size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.stopName}>{stop.name}</Text>
                              {/* Display bus stop coordinates from server (route/arrival data) */}
                              {(() => {
                                const loc = stop.gpsLocation || stop.location;
                                const lat = loc?.lat;
                                const lon = loc?.lon ?? (loc as any)?.lng;
                                if (lat == null || lon == null) return null;
                                return (
                                  <Text style={[styles.coordinateText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                                    {Number(lat).toFixed(6)}, {Number(lon).toFixed(6)}
                                  </Text>
                                );
                              })()}
                            </View>
                      </View>
                          <Text style={styles.scheduledTime}>{stop.scheduledTime}</Text>
                          <View style={styles.actualTimeCell}>
                            {isLive && trackerIsOnline && <View style={styles.liveDot} />}
                            <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                              <Text style={[
                                styles.actualTime,
                                displayTime !== '-' && styles.actualTimeArrived
                              ]}>
                                {displayTime}
                              </Text>
                              {/* Display date from MongoDB GPS data in ACTUAL column */}
                              {stop.gpsLocation?.date && displayTime !== '-' && (
                                <Text style={[styles.coordinateText, { color: isDark ? '#64748B' : '#94A3B8', fontSize: 9, marginTop: 2 }]}>
                                  {stop.gpsLocation.date}
                                </Text>
                              )}
                            </View>
                      </View>
                    </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))
          )}
      </ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean) => {
  const theme = colors[isDark ? 'dark' : 'light'];
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
  backButton: {
    width: 44,
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '400',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusIndicatorLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusIndicatorOffline: {
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
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#1E293B',
    letterSpacing: 0.5,
  },
  refreshButton: {
    width: 44,
    height: 44,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  searchContainer: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#F1F5F9' : '#1E293B',
    padding: 0,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#E5E7EB',
  },
  datePickerText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
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
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: isDark ? '#CBD5E1' : '#374151',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  dateHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: theme.primary,
  },
  modalButtonSecondary: {
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#D1D5DB',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: isDark ? '#CBD5E1' : '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 4,
  },
  filterButton: {
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: 12,
  },
  arrivalsContainer: {
    flex: 1,
  },
  routeSection: {
    marginBottom: 20,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  routeHeaderText: {
    flex: 1,
  },
  routeId: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 2,
  },
  routeDescription: {
    fontSize: 13,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  stopsTable: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#94A3B8' : '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  stopRowLast: {
    borderBottomWidth: 0,
  },
  stopCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    color: isDark ? '#F1F5F9' : '#1E293B',
    fontWeight: '500',
  },
  coordinateText: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  scheduledTime: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    flex: 1,
    textAlign: 'center',
  },
  actualTimeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  actualTime: {
    fontSize: 14,
    color: isDark ? '#64748B' : '#94A3B8',
    minWidth: 80,
    textAlign: 'right',
  },
  actualTimeArrived: {
    color: '#10B981',
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  selectRouteButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  selectRouteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  routeSelectorModal: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  routesList: {
    flex: 1,
  },
  routesListContent: {
    paddingBottom: 20,
  },
  routesListHeader: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  routeItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E5E7EB',
  },
  routeItemContent: {
    flexDirection: 'column',
  },
  routeItemSelected: {
    backgroundColor: isDark ? '#1E40AF' : '#DBEAFE',
    borderColor: '#3B82F6',
  },
  routeItemId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 4,
  },
  routeItemName: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  emptyRoutesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyRoutesText: {
    fontSize: 16,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  arrivalCard: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  arrivalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 2,
  },
  arrivalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: isDark ? '#CBD5E1' : '#374151',
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: isDark ? '#334155' : '#E5E7EB',
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#CBD5E1' : '#374151',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#6B7280',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  calendarModal: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  closeButton: {
    fontSize: 24,
    color: isDark ? '#94A3B8' : '#64748B',
    padding: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: (width * 0.9 - 40) / 7,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
    marginBottom: 8,
  },
  calendarDay: {
    width: (width * 0.9 - 40) / 7,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCalendarDay: {
    backgroundColor: theme.primary,
    borderRadius: 20,
  },
  calendarDayWithData: {
    backgroundColor: isDark ? '#334155' : '#E0F2FE',
  },
  calendarDayText: {
    fontSize: 16,
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  selectedCalendarDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIndicatorText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filtersModal: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  filtersContent: {
    flex: 1,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#CBD5E1' : '#374151',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: isDark ? '#F1F5F9' : '#1E293B',
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#D1D5DB',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
  },
  statusButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  statusButtonText: {
    fontSize: 14,
    color: isDark ? '#CBD5E1' : '#374151',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#D1D5DB',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
  },
  clearButtonText: {
    fontSize: 16,
    color: isDark ? '#CBD5E1' : '#374151',
  },
  applyButton: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Tracker styles
  trackerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  onlineIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  trackerDetails: {
    gap: 4,
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackerLabel: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    fontWeight: '500',
  },
  trackerValue: {
    fontSize: 12,
    color: isDark ? '#F1F5F9' : '#1E293B',
    fontWeight: '600',
  },
  // Location styles
  locationContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: isDark ? '#1E40AF' : '#DBEAFE',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#1E293B',
    flex: 1,
    marginLeft: 8,
  },
  locationDetails: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: isDark ? '#CBD5E1' : '#374151',
    fontWeight: '600',
  },
  locationValue: {
    fontSize: 14,
    color: isDark ? '#F1F5F9' : '#1E293B',
    fontWeight: '700',
  },
  // Current location prominent display
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: isDark ? '#1E40AF' : '#DBEAFE',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  currentLocationText: {
    fontSize: 16,
    color: isDark ? '#F1F5F9' : '#1E293B',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  currentLocationHighlight: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
  },
  // Locations summary styles
  locationsSummaryContainer: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationsSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
    marginBottom: 12,
  },
  locationsSummaryList: {
    gap: 8,
  },
  locationSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderRadius: 8,
  },
  locationSummaryRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  locationSummaryArea: {
    fontSize: 14,
    color: isDark ? '#94A3B8' : '#64748B',
    flex: 1,
    textAlign: 'center',
  },
  locationSummaryStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationSummaryStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  });
};
