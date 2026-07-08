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
  TextInput,
  Modal,
  Switch,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  ArrowLeft,
  Upload,
  Search,
  Pencil,
  Trash2,
  Users,
  List,
  CheckCircle,
  RefreshCw,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../(auth)/context/ThemeContext";
import { isPickingFileRef } from "../(auth)/context/AuthProvider";
import { getApiCandidates } from "../config/api";

type StudentRow = {
  id: string;
  _id?: string;
  regNo: string;
  name: string;
  email: string;
  busRoute?: string | null;
  paidStatus: string;
};

type TabKey = "view" | "upload";

const ALL_ROUTES = [
  ...Array.from({ length: 10 }, (_, i) => `VV${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `GV${i + 1}`),
];

export default function RouteStudents() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId?: string | string[] }>();
  const routeId = String(Array.isArray(params.routeId) ? params.routeId[0] : params.routeId || "")
    .trim()
    .toUpperCase();

  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("view");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoute, setEditRoute] = useState("");
  const [editPaid, setEditPaid] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  const mapStudent = (u: any): StudentRow => ({
    id: String(u.id || u._id || ""),
    _id: String(u._id || u.id || ""),
    regNo: String(u.regNo || "").toUpperCase(),
    name: String(u.name || ""),
    email: String(u.email || ""),
    busRoute: u.busRoute ? String(u.busRoute).toUpperCase() : null,
    paidStatus: u.paidStatus || "Unpaid",
  });

  const loadStudents = useCallback(async () => {
    if (!routeId) return;
    try {
      setLoading(true);
      const query = `/api/users?busRoute=${encodeURIComponent(routeId)}`;
      const { res, json } = await fetchJsonWithFallback(query);
      if (!res.ok) throw new Error(json.error || "Failed to load students");
      const list = (json.users || []).map(mapStudent);
      const count = Number(json.total ?? json.count ?? list.length);
      setStudents(list);
      setTotalCount(count);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not load students");
      setStudents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, search]);

  const openEdit = (student: StudentRow) => {
    setEditStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditRoute(student.busRoute || routeId);
    setEditPaid(student.paidStatus === "Paid");
    setRoutePickerOpen(false);
    setEditVisible(true);
  };

  const saveEdit = async () => {
    if (!editStudent?.regNo) return;
    try {
      setEditSaving(true);
      const { res, json } = await fetchJsonWithFallback(
        `/api/users/${encodeURIComponent(editStudent.regNo)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim().toLowerCase(),
            busRoute: editRoute,
            paidStatus: editPaid ? "Paid" : "Unpaid",
          }),
        }
      );
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");

      const updated = mapStudent(json.user);
      setStudents((prev) => {
        if (updated.busRoute !== routeId) {
          setTotalCount((c) => Math.max(0, c - 1));
          return prev.filter((s) => s.id !== editStudent.id);
        }
        return prev.map((s) => (s.id === editStudent.id ? updated : s));
      });

      if (updated.busRoute !== routeId) {
        Alert.alert("Student moved", `${updated.name} reassigned to ${updated.busRoute}`);
      }

      setEditVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not save student");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (student: StudentRow) => {
    Alert.alert(
      "Delete student",
      `Are you sure you want to remove ${student.name} from this route?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteStudent(student),
        },
      ]
    );
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      "Delete all students",
      `This will delete ALL students in ${routeId}. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete All", style: "destructive", onPress: deleteAllStudents },
      ]
    );
  };

  const deleteAllStudents = async () => {
    try {
      setBulkDeleting(true);
      const { res, json } = await fetchJsonWithFallback(
        `/api/users/bulk?busRoute=${encodeURIComponent(routeId)}`,
        { method: "DELETE" }
      );
      if (!res.ok || !json.success) throw new Error(json.error || "Bulk delete failed");
      setStudents([]);
      setTotalCount(0);
      setSearch("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not delete students");
    } finally {
      setBulkDeleting(false);
    }
  };

  const deleteStudent = async (student: StudentRow) => {
    const userId = student.id || student._id;
    if (!userId) {
      Alert.alert("Error", "Missing student id");
      return;
    }

    const previous = students;
    const previousTotal = totalCount;
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    setTotalCount((c) => Math.max(0, c - 1));

    try {
      const { res, json } = await fetchJsonWithFallback(
        `/api/users/${encodeURIComponent(userId)}/delete`,
        { method: "DELETE" }
      );
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
    } catch (error: any) {
      setStudents(previous);
      setTotalCount(previousTotal);
      Alert.alert("Error", error.message || "Could not delete student");
    }
  };

  const handleUpload = async () => {
    let file: DocumentPicker.DocumentPickerAsset | null = null;
    try {
      isPickingFileRef.current = true;
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      file = result.assets[0];
    } finally {
      setTimeout(() => {
        isPickingFileRef.current = false;
      }, 800);
    }

    try {
      if (!file) return;

      const picked = file;
      const name = picked.name || "students.csv";
      const lower = name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        Alert.alert("Invalid file", "Please choose a CSV or Excel file.");
        return;
      }

      setUploading(true);
      setUploadSummary(null);

      const formData = new FormData();
      formData.append("csvFile", {
        uri: picked.uri,
        name,
        type: picked.mimeType || "application/octet-stream",
      } as any);
      formData.append("routeId", routeId);
      formData.append("selectedRoute", routeId);

      const urls = getApiCandidates("/api/admin/upload-students-csv");
      let response: Response | null = null;
      let json: any = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, { method: "POST", body: formData });
          json = await res.json();
          response = res;
          break;
        } catch {
          // try next
        }
      }

      if (!response) throw new Error("Upload request failed");

      if (!response.ok || !json?.success) {
        const errList = Array.isArray(json?.errors) ? json.errors : json?.error ? [json.error] : [];
        setUploadSummary({ created: 0, updated: 0, errors: errList.length ? errList : ["Upload failed"] });
        return;
      }

      const summary = json.summary || {};
      setUploadSummary({
        created: summary.created || 0,
        updated: summary.updated || 0,
        errors: Array.isArray(summary.errors) ? summary.errors : [],
      });

      await loadStudents();
      setActiveTab("view");
    } catch (error: any) {
      setUploadSummary({ created: 0, updated: 0, errors: [error.message || "Upload failed"] });
    } finally {
      setUploading(false);
    }
  };

  const renderStudentRow = ({ item }: { item: StudentRow }) => (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.regNo}</Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.email}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.paidStatus === "Paid" ? "#10B98122" : "#EF444422" },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: item.paidStatus === "Paid" ? "#059669" : "#DC2626" },
            ]}
          >
            {item.paidStatus}
          </Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Pencil size={18} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
          <Trash2 size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!routeId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: 24 }}>Missing route. Go back and select a route.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={(isDark ? colors.gradientOmbreHeader : ["#3A0CA3", "#2A0A7A"]) as any}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{routeId} Students</Text>
          <Text style={styles.headerSubtitle}>{totalCount} total · View · Upload · Edit · Delete</Text>
        </View>
      </LinearGradient>

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "view" && { backgroundColor: colors.primary + "18" }]}
          onPress={() => setActiveTab("view")}
        >
          <List size={16} color={activeTab === "view" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === "view" ? colors.primary : colors.textSecondary }]}>
            View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upload" && { backgroundColor: "#10B98122" }]}
          onPress={() => setActiveTab("upload")}
        >
          <Upload size={16} color={activeTab === "upload" ? "#059669" : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === "upload" ? "#059669" : colors.textSecondary }]}>
            Upload
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.deleteAllBtn, bulkDeleting && styles.deleteAllBtnDisabled]}
        onPress={confirmDeleteAll}
        disabled={bulkDeleting || students.length === 0}
        activeOpacity={0.85}
      >
        {bulkDeleting ? (
          <ActivityIndicator color="#DC2626" />
        ) : (
          <>
            <Trash2 size={18} color="#DC2626" />
            <Text style={styles.deleteAllBtnText}>Delete All Students</Text>
          </>
        )}
      </TouchableOpacity>

      {activeTab === "view" ? (
        <View style={styles.viewPane}>
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search name or reg no..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.countBanner}>
            <Users size={18} color={colors.primary} />
            <Text style={[styles.countBannerText, { color: colors.text }]}>
              {search
                ? `${filteredStudents.length} matching "${search}" (${totalCount} on ${routeId})`
                : `${totalCount} student${totalCount === 1 ? "" : "s"} on ${routeId}`}
            </Text>
            <TouchableOpacity onPress={loadStudents} style={styles.refreshBtn}>
              <RefreshCw size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id || item.regNo}
              renderItem={renderStudentRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No students on this route yet. Use the Upload tab to add CSV/Excel.
                </Text>
              }
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.uploadPane}>
          <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>
            Upload a CSV or Excel file. All rows will be assigned to {routeId} automatically.
          </Text>
          <Text style={[styles.uploadCols, { color: colors.textSecondary }]}>
            Columns: regNo, name, email, dues, paidStatus
          </Text>

          <TouchableOpacity
            style={styles.uploadGreenBtn}
            onPress={handleUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Upload size={20} color="#fff" />
                <Text style={styles.uploadGreenText}>Upload CSV / Excel</Text>
              </>
            )}
          </TouchableOpacity>

          {uploadSummary ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <CheckCircle size={18} color="#059669" />
                <Text style={[styles.summaryLine, { color: colors.text }]}>
                  {uploadSummary.created} students added
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <RefreshCw size={18} color="#2563EB" />
                <Text style={[styles.summaryLine, { color: colors.text }]}>
                  {uploadSummary.updated} students updated
                </Text>
              </View>
              {uploadSummary.errors.length > 0 ? (
                <View style={styles.errorsBlock}>
                  <Text style={[styles.errorsTitle, { color: "#DC2626" }]}>
                    {uploadSummary.errors.length} error(s)
                  </Text>
                  {uploadSummary.errors.slice(0, 8).map((err, i) => (
                    <Text key={i} style={[styles.errorLine, { color: colors.textSecondary }]}>
                      • {err}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit student</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bus route</Text>
            <TouchableOpacity
              style={[styles.fieldInput, styles.routeSelect, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setRoutePickerOpen(!routePickerOpen)}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>{editRoute}</Text>
            </TouchableOpacity>
            {routePickerOpen ? (
              <ScrollView style={[styles.routeDropdown, { borderColor: colors.border }]} nestedScrollEnabled>
                {ALL_ROUTES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.routeOption, editRoute === r && { backgroundColor: colors.primary + "15" }]}
                    onPress={() => {
                      setEditRoute(r);
                      setRoutePickerOpen(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.paidRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Payment status</Text>
              <View style={styles.paidToggle}>
                <Text style={{ color: editPaid ? colors.textSecondary : "#059669", fontWeight: "600" }}>Unpaid</Text>
                <Switch value={editPaid} onValueChange={setEditPaid} trackColor={{ true: "#10B981" }} />
                <Text style={{ color: editPaid ? "#059669" : colors.textSecondary, fontWeight: "600" }}>Paid</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveEdit}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  deleteAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    backgroundColor: "#DC262612",
  },
  deleteAllBtnDisabled: { opacity: 0.6 },
  deleteAllBtnText: { color: "#DC2626", fontWeight: "800", fontSize: 14 },
  viewPane: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  countBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  countBannerText: { flex: 1, fontSize: 14, fontWeight: "600" },
  refreshBtn: { padding: 4 },
  listContent: { paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rowMain: { flex: 1, gap: 2 },
  rowName: { fontSize: 16, fontWeight: "700" },
  rowMeta: { fontSize: 12 },
  badge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  rowActions: { justifyContent: "center", gap: 10, paddingLeft: 8 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563EB18",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DC262618",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  emptyText: { textAlign: "center", marginTop: 32, fontSize: 14 },
  uploadPane: { padding: 16, paddingBottom: 32 },
  uploadHint: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  uploadCols: { fontSize: 12, marginBottom: 20 },
  uploadGreenBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
  },
  uploadGreenText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  summaryCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryLine: { fontSize: 15, fontWeight: "600" },
  errorsBlock: { marginTop: 8, gap: 4 },
  errorsTitle: { fontWeight: "700", fontSize: 14 },
  errorLine: { fontSize: 12, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  routeSelect: { justifyContent: "center" },
  routeDropdown: {
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  routeOption: { paddingVertical: 10, paddingHorizontal: 12 },
  paidRow: { marginTop: 12, marginBottom: 8 },
  paidToggle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  saveBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
