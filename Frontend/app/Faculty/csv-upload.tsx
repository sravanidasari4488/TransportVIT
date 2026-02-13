import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { getApiUrl, API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';

export default function CSVUpload() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets[0]) {
        await uploadCSVFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking CSV file:', error);
      Alert.alert('Error', 'Failed to pick CSV file');
    }
  };

  const uploadCSVFile = async (file: any) => {
    try {
      setUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('csvFile', {
        uri: file.uri,
        type: 'text/csv',
        name: file.name || 'student_fees.csv',
      } as any);
      formData.append('uploadedBy', user?.displayName || user?.email || 'Unknown');

      const response = await fetch(getApiUrl('/api/student-fees/upload-csv'), {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
      });

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Response is not JSON:', responseText);
        throw new Error('Server returned invalid response. Please check if the server is running.');
      }

      if (result.success) {
        setUploadResult(result);
        Alert.alert(
          'Success',
          `Successfully uploaded ${result.summary.totalRecords} records!\n\n` +
          `Successfully inserted: ${result.summary.successfulInsertions}\n` +
          `Errors: ${result.summary.errors}`
        );
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload CSV file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Upload Student Fees CSV</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Upload a CSV file containing student fees data
        </Text>
      </View>

      <View style={[styles.uploadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.uploadIcon}>
          <FileText size={48} color={colors.primary} />
        </View>
        
        <Text style={[styles.uploadTitle, { color: colors.text }]}>
          Select CSV File
        </Text>
        
        <Text style={[styles.uploadDescription, { color: colors.textSecondary }]}>
          Choose a CSV file with student fees data. The file should contain columns: Semester, Name, RegNumber, Dues, PrevPaid, ThisSemPaidOrNotPaid
        </Text>

        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={pickCSVFile}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Upload size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Choose CSV File</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {uploadResult && (
        <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.resultHeader}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={[styles.resultTitle, { color: colors.text }]}>Upload Complete</Text>
          </View>
          
          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Records</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {uploadResult.summary.totalRecords}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Successfully Inserted</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {uploadResult.summary.successfulInsertions}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Errors</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {uploadResult.summary.errors}
              </Text>
            </View>
          </View>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <View style={styles.errorSection}>
              <View style={styles.errorHeader}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={[styles.errorTitle, { color: colors.text }]}>Errors Found</Text>
              </View>
              <ScrollView style={styles.errorList}>
                {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                  <Text key={index} style={[styles.errorText, { color: colors.textSecondary }]}>
                    • {error}
                  </Text>
                ))}
                {uploadResult.errors.length > 5 && (
                  <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                    ... and {uploadResult.errors.length - 5} more errors
                  </Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>CSV Format Requirements</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Your CSV file should have the following columns:
        </Text>
        <View style={styles.columnList}>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• Semester (e.g., "1 BCA", "3 BCA")</Text>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• Name (Student's full name)</Text>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• RegNumber (Registration number)</Text>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• Dues (Amount in numbers)</Text>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• PrevPaid ("Yes" or "No")</Text>
          <Text style={[styles.columnItem, { color: colors.textSecondary }]}>• ThisSemPaidOrNotPaid ("Paid" or "Not Paid")</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  uploadCard: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  resultCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorList: {
    maxHeight: 120,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
  },
  columnList: {
    gap: 4,
  },
  columnItem: {
    fontSize: 13,
  },
});
