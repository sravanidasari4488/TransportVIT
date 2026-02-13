import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { MapPin, Clock, CheckCircle, CircleAlert, Circle } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

interface Stop {
  name: string;
  location: {
    lat: number;
    lon: number;
  };
  scheduledTime: string;
  actualTime: string | null;
  arrivalTimestamp: Date | null;
  delay: number | null;
  status: 'pending' | 'on_time' | 'delayed' | 'early';
  isActive: boolean;
}

interface RouteStopsListProps {
  routeId: string;
  routeName?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function RouteStopsList({ 
  routeId, 
  routeName,
  autoRefresh = true,
  refreshInterval = 5000 
}: RouteStopsListProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchStops = async () => {
    try {
      const url = `${API_CONFIG.BASE_URL}/api/routes/${routeId.toUpperCase()}/stops-with-arrivals`;
      console.log('Fetching stops from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text();
        console.error(`API Error (${response.status}):`, text);
        throw new Error(`Failed to fetch stops: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Response is not JSON:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (data.success && data.stops) {
        setStops(data.stops);
      } else if (data.error) {
        console.error('API returned error:', data.error);
        // Set empty stops array if route not found
        setStops([]);
      } else {
        // Handle case where route might not exist
        console.warn('Route data not found. Route may need to be created in database.');
        setStops([]);
      }
    } catch (error) {
      console.error('Error fetching stops:', error);
      // Set empty array on error to prevent crashes
      setStops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStops();

    // Setup WebSocket connection
    // For Railway/production, use the same URL but with appropriate protocol
    let socketUrl = API_CONFIG.BASE_URL;
    if (socketUrl.startsWith('https://')) {
      socketUrl = socketUrl.replace('https://', 'wss://');
    } else if (socketUrl.startsWith('http://')) {
      socketUrl = socketUrl.replace('http://', 'ws://');
    }
    
    const socketConnection = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      path: '/socket.io/',
    });

    socketRef.current = socketConnection;
    setSocket(socketConnection);

    // Join route room
    socketConnection.emit('join-route', routeId.toUpperCase());

    // Handle connection
    socketConnection.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    socketConnection.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    // Listen for arrival updates
    socketConnection.on('arrival-update', (data: any) => {
      console.log('📢 Received arrival update:', data);
      
      setStops(prevStops => 
        prevStops.map(stop => {
          if (stop.name === data.stopName) {
            return {
              ...stop,
              actualTime: data.actualTime,
              arrivalTimestamp: new Date(data.arrivalTimestamp),
              delay: data.delay,
              status: data.status
            };
          }
          return stop;
        })
      );
    });

    // Setup auto-refresh
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchStops, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
      socketConnection.emit('leave-route', routeId.toUpperCase());
      socketConnection.disconnect();
    };
  }, [routeId, autoRefresh, refreshInterval]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStops();
  };

  const getStatusIcon = (status: string, actualTime: string | null) => {
    if (actualTime) {
      if (status === 'on_time') {
        return <CheckCircle size={20} color="#10B981" />;
      } else if (status === 'delayed') {
        return <CircleAlert size={20} color="#EF4444" />;
      } else {
        return <CheckCircle size={20} color="#3B82F6" />;
      }
    }
    return <Circle size={20} color="#9CA3AF" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time':
        return '#10B981';
      case 'delayed':
        return '#EF4444';
      case 'early':
        return '#3B82F6';
      default:
        return '#9CA3AF';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading stops...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.statusText}>
            {connected ? 'Live Updates Active' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Route Header */}
      {routeName && (
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>{routeName}</Text>
          <Text style={styles.routeSubtitle}>{stops.length} stops</Text>
        </View>
      )}

      {/* Stops List */}
      <View style={styles.stopsContainer}>
        {stops.map((stop, index) => (
          <View key={index} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <View style={styles.stopLeft}>
                <View style={[styles.stopIcon, { backgroundColor: getStatusColor(stop.status) + '20' }]}>
                  {getStatusIcon(stop.status, stop.actualTime)}
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.locationText}>
                      {stop.location?.lat?.toFixed(4)}, {stop.location?.lon?.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>
            </View>

            <View style={styles.stopTimes}>
              <View style={styles.timeRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.scheduledTime}>
                  Scheduled: {stop.scheduledTime}
                </Text>
              </View>
              
              {stop.actualTime ? (
                <View style={styles.timeRow}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.actualTime}>
                    Arrived: {stop.actualTime}
                  </Text>
                </View>
              ) : (
                <View style={styles.timeRow}>
                  <Circle size={16} color="#9CA3AF" />
                  <Text style={styles.pendingTime}>Awaiting arrival...</Text>
                </View>
              )}

              {stop.delay !== null && stop.delay !== 0 && (
                <View style={styles.delayBadge}>
                  <Text style={styles.delayText}>
                    {stop.delay > 0 ? '+' : ''}{stop.delay} min
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Empty State */}
      {stops.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No stops found</Text>
          <Text style={styles.emptyText}>
            The route "{routeId.toUpperCase()}" may not exist in the database yet.
          </Text>
          <Text style={styles.emptySubtext}>
            Please create the route with stops in the backend, or contact an administrator.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  statusBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  routeHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  stopsContainer: {
    padding: 16,
  },
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stopTimes: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pendingTime: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  delayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  delayText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});

