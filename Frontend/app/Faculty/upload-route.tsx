import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Pencil, Trash2, RefreshCcw } from "lucide-react-native";
import { useTheme } from "../(auth)/context/ThemeContext";
import { isPickingFileRef } from "../(auth)/context/AuthProvider";
import { getApiCandidates } from "../config/api";

type UploadSummary = {
  _id: string;
  route?: string;
  originalName: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  uploadedAt: string;
};

export default function RouteUploadPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ route?: string }>();
  const route = String(params.route || "").toUpperCase();
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [files, setFiles] = useState<UploadSummary[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [activeBaseUrl, setActiveBaseUrl] = useState<string | null>(null);

  const routeFiles = useMemo(() => files.filter((f) => (f.route || "").toUpperCase() === route), [files, route]);

  const fetchJsonWithFallback = async (endpoint: string, options?: RequestInit) => {
    const urls = getApiCandidates(endpoint);
    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, options);
        const json = await res.json();
        const base = url.replace(endpoint, "");
        setActiveBaseUrl(base);
        return { res, json };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Network request failed");
  };

  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const { res, json } = await fetchJsonWithFallback("/api/admin/files");
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load files");
      setFiles(json.files || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch uploaded files");
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const pickFileAndRun = async (mode: "create" | "update", fileId?: string) => {
    try {
      isPickingFileRef.current = true;
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      await uploadFile(result.assets[0], mode, fileId);
    } catch {
      Alert.alert("Error", "Failed to pick file");
    } finally {
      setTimeout(() => {
        isPickingFileRef.current = false;
      }, 800);
    }
  };

  const uploadFile = async (file: any, mode: "create" | "update", fileId?: string) => {
    try {
      setUploading(true);
      const isCsv = (file.name || "").toLowerCase().endsWith(".csv");
      const endpoint = mode === "create" ? "/api/admin/upload-students-csv" : `/api/admin/files/${fileId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const urls = getApiCandidates(endpoint);
      let response: Response | null = null;
      let result: any = null;
      let lastError: any = null;

      for (const url of urls) {
        try {
          // Build a fresh multipart body per attempt.
          const formData = new FormData();
          formData.append("csvFile", {
            uri: file.uri,
            type: isCsv ? "text/csv" : "application/octet-stream",
            name: file.name || "students.csv",
          } as any);
          formData.append("selectedRoute", route);

          const res = await fetch(url, { method, body: formData });
          const json = await res.json();
          setActiveBaseUrl(url.replace(endpoint, ""));
          response = res;
          result = json;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw lastError || new Error("Network request failed while uploading file");
      }

      if (!response.ok || !result.success) {
        const firstError = result.errors?.[0] || result.error || "Request failed";
        throw new Error(firstError);
      }

      setUploadResult(result);
      await loadFiles();
      Alert.alert("Success", `${route} file ${mode === "create" ? "uploaded" : "updated"} successfully`);
    } catch (error: any) {
      Alert.alert("Request Failed", error.message || "Operation failed");
    } finally {
      setUploading(false);
    }
  };

  const viewFile = async (id: string) => {
    try {
      const { res, json } = await fetchJsonWithFallback(`/api/admin/files/${id}`);
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to view file");
      setPreview(json.preview || []);
      setPreviewFileName(json.file?.originalName || "Uploaded file");
      setPreviewModalVisible(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Unable to open file preview");
    }
  };

  const deleteFile = async (id: string) => {
    Alert.alert("Delete file", "Are you sure you want to delete this uploaded file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { res, json } = await fetchJsonWithFallback(`/api/admin/files/${id}`, { method: "DELETE" });
            if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
            await loadFiles();
            setPreview([]);
            setPreviewFileName("");
            Alert.alert("Deleted", "File deleted successfully");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Delete failed");
          }
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Upload Students - {route}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Only {route} students file upload/update is allowed on this page.</Text>
          {activeBaseUrl ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Connected to: {activeBaseUrl}</Text> : null}
        </View>

        <View style={[styles.uploadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileText size={44} color={colors.primary} />
          <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={() => pickFileAndRun("create")} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> : <><Upload size={18} color="#fff" /><Text style={styles.uploadText}>Upload {route} CSV/Excel</Text></>}
          </TouchableOpacity>
        </View>

        {uploadResult ? (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.resultHead}><CheckCircle size={20} color="#10B981" /><Text style={[styles.resultTitle, { color: colors.text }]}>Last Upload Result</Text></View>
            <Text style={{ color: colors.textSecondary }}>Total: {uploadResult.summary?.total || 0}</Text>
            <Text style={{ color: colors.textSecondary }}>Created: {uploadResult.summary?.created || 0}</Text>
            <Text style={{ color: colors.textSecondary }}>Updated: {uploadResult.summary?.updated || 0}</Text>
          </View>
        ) : null}

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.listHead}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>{route} Uploaded Files</Text>
            <TouchableOpacity onPress={loadFiles}><RefreshCcw size={18} color={colors.primary} /></TouchableOpacity>
          </View>

          {loadingFiles ? <ActivityIndicator color={colors.primary} /> : null}
          {!loadingFiles && routeFiles.length === 0 ? <Text style={{ color: colors.textSecondary }}>No uploaded files for {route} yet.</Text> : null}

          {routeFiles.map((file) => (
            <View key={file._id} style={[styles.fileRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "600" }}>{file.originalName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Rows: {file.totalRows} | Created: {file.createdCount} | Updated: {file.updatedCount}</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => viewFile(file._id)}><Eye size={17} color={colors.primary} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => pickFileAndRun("update", file._id)}><Pencil size={17} color={colors.primary} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => deleteFile(file._id)}><Trash2 size={17} color="#EF4444" /></TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.resultHead}><AlertCircle size={18} color="#F59E0B" /><Text style={[styles.resultTitle, { color: colors.text }]}>Required Columns</Text></View>
          <Text style={{ color: colors.textSecondary }}>regNo,name,email,dues,paidStatus</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>This page auto-assigns all uploaded students to {route}.</Text>
        </View>
      </ScrollView>

      <Modal animationType="fade" visible={previewModalVisible} transparent onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.listHead}>
              <Text numberOfLines={1} style={[styles.resultTitle, { color: colors.text, flex: 1 }]}>Preview: {previewFileName}</Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}><Text style={{ color: colors.primary, fontWeight: "700" }}>Close</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={[styles.tableRow, styles.tableHeader, { borderColor: colors.border }]}>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Reg No</Text>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Name</Text>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Email</Text>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Route</Text>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Dues</Text>
                  <Text style={[styles.tableCellHeader, { color: colors.text }]}>Paid Status</Text>
                </View>
                <ScrollView style={{ maxHeight: 320 }}>
                  {preview.map((row, idx) => (
                    <View key={`${row.regNo}-${idx}`} style={[styles.tableRow, { borderColor: colors.border }]}>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.regNo}</Text>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.name}</Text>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.email}</Text>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.route}</Text>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.dues}</Text>
                      <Text style={[styles.tableCell, { color: colors.textSecondary }]}>{row.paidStatus}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 18 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { marginTop: 6 },
  uploadCard: { borderWidth: 1, borderRadius: 12, padding: 20, alignItems: "center", marginBottom: 14, gap: 12 },
  uploadButton: { flexDirection: "row", gap: 8, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  uploadText: { color: "#fff", fontWeight: "600" },
  resultCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  listCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  resultHead: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  resultTitle: { fontWeight: "700" },
  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, gap: 6 },
  iconBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 18 },
  modalCard: { width: "100%", maxWidth: 900, borderRadius: 14, borderWidth: 1, padding: 14 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1 },
  tableHeader: { borderTopWidth: 1 },
  tableCellHeader: { width: 140, fontWeight: "700", paddingVertical: 10, paddingHorizontal: 8 },
  tableCell: { width: 140, paddingVertical: 10, paddingHorizontal: 8 },
});