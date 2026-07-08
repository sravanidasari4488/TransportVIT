import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  PanResponder,
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  ArrowLeft,
  X,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  MapPin,
  Navigation,
} from "lucide-react-native";
import type { RouteData } from "./busRouteTypes";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_HEIGHT * 0.55;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;
const SNAP_FULL = 0;
const PEEK_VISIBLE = 112;
const SNAP_PEEK = SHEET_HEIGHT - PEEK_VISIBLE;
const GREEN = "#10B981";
const GREEN_DARK = "#059669";

export function buildVV1TrackingMapHtml(title: string, gpsBusId: string) {
  const gpsUrl = `https://git-backend-1-production.up.railway.app/api/gps/latest_location/${encodeURIComponent(gpsBusId)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} Live</title>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map, marker, pulseCircle, pulseRing, pulseGrowing = true;

    function initMap() {
      map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: { lat: 16.5088, lng: 80.6156 },
        disableDefaultUI: false,
      });

      marker = new google.maps.Marker({
        map,
        icon: "http://maps.google.com/mapfiles/ms/icons/bus.png",
        title: "Live ${title} Bus",
        zIndex: 1000,
      });

      pulseCircle = new google.maps.Circle({
        strokeColor: "${GREEN}",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "${GREEN}",
        fillOpacity: 0.22,
        map,
        center: { lat: 16.5088, lng: 80.6156 },
        radius: 55,
        zIndex: 998,
      });

      pulseRing = new google.maps.Circle({
        strokeColor: "${GREEN}",
        strokeOpacity: 0.45,
        strokeWeight: 1,
        fillColor: "${GREEN}",
        fillOpacity: 0.08,
        map,
        center: { lat: 16.5088, lng: 80.6156 },
        radius: 90,
        zIndex: 997,
      });

      setInterval(function() {
        if (!pulseCircle || !pulseRing) return;
        var r1 = pulseCircle.getRadius();
        var r2 = pulseRing.getRadius();
        if (pulseGrowing) {
          pulseCircle.setRadius(r1 + 4);
          pulseRing.setRadius(r2 + 6);
          if (r1 > 110) pulseGrowing = false;
        } else {
          pulseCircle.setRadius(Math.max(45, r1 - 4));
          pulseRing.setRadius(Math.max(70, r2 - 6));
          if (r1 <= 50) pulseGrowing = true;
        }
      }, 120);

      updateLocation();
      setInterval(updateLocation, 5000);
    }

    async function updateLocation() {
      try {
        const res = await fetch("${gpsUrl}");
        const data = await res.json();
        const lat = parseFloat(data.latitude || data.lat);
        const lng = parseFloat(data.longitude || data.lon);
        if (!lat || !lng) return;
        var pos = { lat: lat, lng: lng };
        marker.setPosition(pos);
        map.panTo(pos);
        if (pulseCircle) pulseCircle.setCenter(pos);
        if (pulseRing) pulseRing.setCenter(pos);
      } catch (e) {
        console.error("GPS error", e);
      }
    }
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB48fIbQ7fTdXAp-pPf_mjXXAf2BEQMDI0&callback=initMap"></script>
</body>
</html>`;
}

type StopStatus = {
  status?: string;
  actualTime?: string;
  scheduledTime?: string;
} | null;

type TrackingMeta = {
  nextStop: string;
  etaMins: number;
  busStatus: "En Route" | "Arrived";
};

type Props = {
  routeData: RouteData;
  mapHtml: string;
  webViewRef: React.RefObject<WebView | null>;
  router: { back: () => void };
  isLive: boolean;
  pulseAnim: Animated.Value;
  trackingMeta: TrackingMeta;
  getStopStatus: (stopName: string) => StopStatus;
  stopArrivalTimes: Record<string, string>;
  mapExpanded: boolean;
  toggleMapExpansion: () => void;
  handleMapResize: () => void;
};

export default function VV1TrackingLayout({
  routeData,
  mapHtml,
  webViewRef,
  router,
  isLive,
  pulseAnim,
  trackingMeta,
  getStopStatus,
  stopArrivalTimes,
  mapExpanded,
  toggleMapExpansion,
  handleMapResize,
}: Props) {
  const sheetY = useRef(new Animated.Value(SNAP_PEEK)).current;
  const sheetOffsetRef = useRef(SNAP_PEEK);
  const dragStartSnapRef = useRef(SNAP_PEEK);

  const snapSheet = useCallback((toValue: number) => {
    sheetOffsetRef.current = toValue;
    Animated.spring(sheetY, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [sheetY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          dragStartSnapRef.current = sheetOffsetRef.current;
          sheetY.stopAnimation();
          sheetY.setOffset(dragStartSnapRef.current);
          sheetY.setValue(0);
        },
        onPanResponderMove: (_, gesture) => {
          const merged = dragStartSnapRef.current + gesture.dy;
          const clamped = Math.max(SNAP_FULL, Math.min(SNAP_PEEK, merged));
          sheetY.setValue(clamped - dragStartSnapRef.current);
        },
        onPanResponderRelease: (_, gesture) => {
          sheetY.flattenOffset();
          const dragDown = gesture.dy > 12 || gesture.vy > 0.25;
          const dragUp = gesture.dy < -12 || gesture.vy < -0.25;

          if (dragDown) {
            snapSheet(SNAP_PEEK);
          } else if (dragUp) {
            snapSheet(SNAP_FULL);
          } else {
            snapSheet(dragStartSnapRef.current);
          }
        },
      }),
    [sheetY, snapSheet]
  );

  const { nextStop, etaMins, busStatus } = trackingMeta;
  const etaLabel =
    busStatus === "Arrived"
      ? "Arrived at campus"
      : etaMins <= 0
        ? "Arriving now"
        : `${etaMins} min${etaMins === 1 ? "" : "s"} to next stop`;

  const resolveTimelineStatus = (stop: string, index: number) => {
    const api = getStopStatus(stop);
    if (api?.status) return api;
    const arrived = stopArrivalTimes[stop] || Object.entries(stopArrivalTimes).find(([k]) => k.toLowerCase() === stop.toLowerCase())?.[1];
    if (arrived) return { status: "completed", actualTime: arrived };
    const sched = routeData.schedule.find(
      (s) => s.stopName === stop || s.stopName.toLowerCase() === stop.toLowerCase()
    );
    const isNext =
      nextStop === stop ||
      sched?.stopName === nextStop ||
      nextStop?.toLowerCase() === stop.toLowerCase();
    if (isNext && busStatus === "En Route") return { status: "current" };
    return { status: "pending", scheduledTime: sched?.time };
  };

  const renderTimelineItem = useCallback(
    ({ item: stop, index }: { item: string; index: number }) => {
      const status = resolveTimelineStatus(stop, index);
      const isLast = index === routeData.stops.length - 1;
      const scheduleItem = routeData.schedule.find(
        (item) => item.stopName === stop || item.stopName.toLowerCase() === stop.toLowerCase()
      );
      const isCurrent = status?.status === "current";
      const isCompleted = status?.status === "completed" || !!stopArrivalTimes[stop];

      return (
        <View style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <View
              style={[
                styles.timelineDot,
                isCompleted && styles.dotCompleted,
                isCurrent && styles.dotCurrent,
                !isCompleted && !isCurrent && styles.dotPending,
              ]}
            >
              {isCompleted ? (
                <CheckCircle size={16} color="#FFFFFF" />
              ) : isCurrent ? (
                <AlertCircle size={16} color="#FFFFFF" />
              ) : (
                <Text style={styles.dotNum}>{index + 1}</Text>
              )}
            </View>
            {!isLast ? (
              <View style={[styles.timelineLine, isCompleted && styles.lineCompleted]} />
            ) : null}
          </View>
          <View style={styles.timelineContent}>
            <Text style={[styles.stopTitle, isCurrent && styles.stopTitleActive]}>{stop}</Text>
            <Text style={styles.stopSched}>Scheduled: {scheduleItem?.time}</Text>
            {isLive && (status?.actualTime || stopArrivalTimes[stop]) ? (
              <Text style={styles.stopArrived}>
                Arrived: {status?.actualTime || stopArrivalTimes[stop]}
              </Text>
            ) : null}
            {isCurrent ? <Text style={styles.approaching}>Approaching</Text> : null}
          </View>
        </View>
      );
    },
    [routeData, nextStop, busStatus, isLive, stopArrivalTimes, getStopStatus]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topCard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.topCardBody}>
          <Text style={styles.routeName}>{routeData.title}</Text>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.livePill, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? GREEN : "#9CA3AF" }]} />
              <Text style={[styles.statusText, { color: isLive ? GREEN_DARK : "#6B7280" }]}>
                {busStatus === "Arrived" ? "Arrived" : isLive ? "En Route" : "En Route"}
              </Text>
            </Animated.View>
            {isLive ? (
              <View style={styles.onRouteBadge}>
                <Navigation size={12} color={GREEN_DARK} />
                <Text style={styles.onRouteText}>Live GPS</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.etaText}>{etaLabel}</Text>
        </View>
      </View>

      <View style={styles.mapSection}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
        />
        <TouchableOpacity style={styles.expandMapBtn} onPress={toggleMapExpansion} activeOpacity={0.9}>
          <Text style={styles.expandMapText}>Expand map</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          { height: SHEET_HEIGHT, transform: [{ translateY: sheetY }] },
        ]}
      >
        <View style={styles.sheetDragZone} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
          <View style={styles.nextStopHeader}>
            <MapPin size={20} color={GREEN_DARK} />
            <View style={styles.nextStopTextWrap}>
              <Text style={styles.nextStopLabel}>Next stop</Text>
              <Text style={styles.nextStopName} numberOfLines={2}>
                {nextStop}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={routeData.stops}
          keyExtractor={(stop, index) => `${stop}-${index}`}
          renderItem={renderTimelineItem}
          style={styles.timelineList}
          contentContainerStyle={styles.timelineListContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          bounces
          ListHeaderComponent={
            <Text style={styles.timelineTitle}>Stop timeline</Text>
          }
        />
      </Animated.View>

      <Modal visible={mapExpanded} transparent={false} animationType="slide">
        <View style={styles.expandedWrap}>
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedTitle}>Live bus tracking</Text>
            <TouchableOpacity onPress={toggleMapExpansion} style={styles.closeBtn}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.expandedMap}
            onLoad={handleMapResize}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6", overflow: "hidden" },
  topCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  topCardBody: { flex: 1 },
  routeName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: "700" },
  onRouteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  onRouteText: { fontSize: 11, fontWeight: "600", color: GREEN_DARK },
  etaText: { fontSize: 20, fontWeight: "800", color: "#111827" },
  mapSection: {
    height: MAP_HEIGHT,
    width: "100%",
    backgroundColor: "#E5E7EB",
  },
  map: { flex: 1 },
  expandMapBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  expandMapText: { fontSize: 13, fontWeight: "600", color: GREEN_DARK },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  sheetDragZone: {
    paddingTop: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  nextStopHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  nextStopTextWrap: { flex: 1 },
  nextStopLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 2 },
  nextStopName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  timelineList: { flex: 1 },
  timelineListContent: { paddingHorizontal: 20, paddingBottom: 40 },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 8,
    marginBottom: 12,
  },
  timelineItem: { flexDirection: "row", marginBottom: 4 },
  timelineLeft: { alignItems: "center", marginRight: 14, width: 32 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCompleted: { backgroundColor: GREEN },
  dotCurrent: { backgroundColor: "#F59E0B" },
  dotPending: { backgroundColor: "#E5E7EB" },
  dotNum: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  timelineLine: { width: 2, flex: 1, minHeight: 28, backgroundColor: "#E5E7EB", marginVertical: 4 },
  lineCompleted: { backgroundColor: GREEN },
  timelineContent: { flex: 1, paddingBottom: 16 },
  stopTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  stopTitleActive: { color: GREEN_DARK },
  stopSched: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  stopArrived: { fontSize: 13, fontWeight: "600", color: GREEN_DARK, marginTop: 2 },
  approaching: { fontSize: 12, fontWeight: "700", color: "#F59E0B", marginTop: 4 },
  expandedWrap: { flex: 1, backgroundColor: "#FFF" },
  expandedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  expandedTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: { padding: 8 },
  expandedMap: { flex: 1 },
});
