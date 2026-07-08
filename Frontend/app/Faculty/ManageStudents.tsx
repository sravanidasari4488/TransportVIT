import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Bus, Users, ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../(auth)/context/ThemeContext";
import { getApiCandidates } from "../config/api";

type RouteRow = {
  routeId: string;
  routeName?: string;
  studentCount?: number;
};

const FALLBACK_ROUTES: RouteRow[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ routeId: `VV${i + 1}`, studentCount: 0 })),
  ...Array.from({ length: 10 }, (_, i) => ({ routeId: `GV${i + 1}`, studentCount: 0 })),
];

export default function ManageStudents() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const grouped = useMemo(() => {
    const vv = routes.filter((r) => r.routeId.startsWith("VV"));
    const gv = routes.filter((r) => r.routeId.startsWith("GV"));
    return [
      { title: "Vijayawada", items: vv },
      { title: "Guntur", items: gv },
    ];
  }, [routes]);

  const fetchJsonWithFallback = async (endpoint: string, options?: RequestInit) => {
    const urls = getApiCandidates(endpoint);
    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, options);
        const json = await res.json();
        return { res, json };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Network request failed");
  };

  const fetchStudentCount = async (routeId: string): Promise<number> => {
    const { res, json } = await fetchJsonWithFallback(
      `/api/users?busRoute=${encodeURIComponent(routeId)}`
    );
    if (!res.ok) return 0;
    return Number(json.total ?? json.count ?? 0);
  };

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);

      let routeRows: { routeId: string; routeName?: string }[] = [];
      try {
        const { res, json } = await fetchJsonWithFallback("/api/routes");
        if (res.ok && Array.isArray(json.routes) && json.routes.length) {
          routeRows = json.routes.map((r: any) => ({
            routeId: String(r.routeId || "").toUpperCase(),
            routeName: r.routeName,
          }));
        }
      } catch {
        // use fallback route ids below
      }

      if (!routeRows.length) {
        routeRows = FALLBACK_ROUTES.map((r) => ({ routeId: r.routeId }));
      }

      const list: RouteRow[] = await Promise.all(
        routeRows.map(async (r) => ({
          routeId: r.routeId,
          routeName: r.routeName,
          studentCount: await fetchStudentCount(r.routeId),
        }))
      );

      setRoutes(list);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not load routes");
      const list = await Promise.all(
        FALLBACK_ROUTES.map(async (r) => ({
          ...r,
          studentCount: await fetchStudentCount(r.routeId),
        }))
      );
      setRoutes(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const openRouteStudents = (routeId: string) => {
    router.push({
      pathname: "/Faculty/RouteStudents",
      params: { routeId },
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={(isDark ? colors.gradientOmbreHeader : ["#3A0CA3", "#2A0A7A"]) as any}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Manage Students</Text>
        <Text style={styles.headerSubtitle}>Select a route to view, upload, edit, or delete students</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {grouped.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
              <View style={styles.grid}>
                {group.items.map((route) => (
                  <View
                    key={route.routeId}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                        <Bus size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.routeName, { color: colors.text }]}>{route.routeId}</Text>
                    </View>

                    <View style={styles.countRow}>
                      <Users size={16} color={colors.textSecondary} />
                      <Text style={[styles.countText, { color: colors.textSecondary }]}>
                        {route.studentCount ?? 0} students
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.manageBtn, { backgroundColor: colors.primary }]}
                      onPress={() => openRouteStudents(route.routeId)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.manageBtnText}>Manage Students</Text>
                      <ChevronRight size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontSize: 14 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  group: { marginBottom: 18 },
  groupTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  routeName: { fontSize: 18, fontWeight: "800" },
  countRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  countText: { fontSize: 13, fontWeight: "500" },
  manageBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    minHeight: 40,
  },
  manageBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
