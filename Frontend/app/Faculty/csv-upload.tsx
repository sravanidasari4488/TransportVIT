import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bus, ArrowRight, Sparkles } from "lucide-react-native";
import { useTheme } from "../(auth)/context/ThemeContext";

const { width } = Dimensions.get("window");

const routeGroups = [
  {
    city: "Vijayawada",
    routes: Array.from({ length: 10 }, (_, i) => ({
      key: `VV${i + 1}`,
      from: "VIT Main Gate",
      to: "Campus Route",
    })),
  },
  {
    city: "Guntur",
    routes: Array.from({ length: 10 }, (_, i) => ({
      key: `GV${i + 1}`,
      from: "VIT-AP Campus",
      to: "City Route",
    })),
  },
];

export default function CsvUploadRoutes() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const openRouteUpload = (route: string) => {
    router.push({ pathname: "/Faculty/upload-route", params: { route } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Upload by Bus Route</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Tap a route card to upload that route's students file.</Text>

        {routeGroups.map((group) => (
          <View key={group.city} style={styles.groupWrap}>
            <Text style={[styles.groupTitle, { color: colors.text }]}>{group.city}</Text>
            <Text style={[styles.groupCount, { color: colors.textSecondary }]}>{group.routes.length} routes available</Text>

            <View style={styles.grid}>
              {group.routes.map((route) => (
                <TouchableOpacity
                  key={route.key}
                  activeOpacity={0.9}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openRouteUpload(route.key)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
                      <Bus size={22} color={colors.primary} />
                      <Sparkles size={12} color={colors.primary} style={styles.sparkle} />
                    </View>
                    <Text style={[styles.routeName, { color: colors.text }]}>{route.key}</Text>
                  </View>

                  <View style={styles.pointRow}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.pointText, { color: colors.textSecondary }]} numberOfLines={1}>{route.from}</Text>
                  </View>
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <View style={styles.pointRow}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.pointText, { color: colors.textSecondary }]} numberOfLines={1}>{route.to}</Text>
                  </View>

                  <LinearGradient colors={["#4C1D95", "#6D28D9"]} style={styles.arrowBtn}>
                    <ArrowRight size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 30 },
  heading: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subheading: { fontSize: 14, marginBottom: 16 },
  groupWrap: { marginBottom: 20 },
  groupTitle: { fontSize: 20, fontWeight: "700" },
  groupCount: { fontSize: 13, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: (width - 44) / 2,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    position: "relative",
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  iconWrap: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", position: "relative" },
  sparkle: { position: "absolute", top: -4, right: -2 },
  routeName: { fontSize: 40/2, fontWeight: "800" },
  pointRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pointText: { flex: 1, fontSize: 14, fontWeight: "500" },
  separator: { height: 1, marginVertical: 6, marginLeft: 18 },
  arrowBtn: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});