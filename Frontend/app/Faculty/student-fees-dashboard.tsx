import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { 
  Search, 
  Filter, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react-native';
import { useTheme } from '../(auth)/context/ThemeContext';
import { useAuth } from '../(auth)/context/AuthProvider';
import { getApiUrl } from '../config/api';
import { auth } from '../config/firebase';

interface StudentFees {
  _id: string;
  semester: string;
  name: string;
  regNumber: string;
  dues: number;
  prevPaid: 'Yes' | 'No';
  thisSemPaidOrNotPaid: 'Paid' | 'Not Paid';
  uploadDate: string;
}

interface DashboardSummary {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalDues: number;
  paymentRate: string;
}

export default function StudentFeesDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<StudentFees[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async (page = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedSemester && { semester: selectedSemester }),
        ...(selectedPaymentStatus && { paymentStatus: selectedPaymentStatus }),
      });

              const response = await fetch(
          `${getApiUrl('/api/student-fees')}?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
            },
          }
        );

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Response is not JSON:', responseText);
        throw new Error('Server returned invalid response. Please check if the server is running.');
      }

      if (result.success) {
        setStudents(result.data);
        setCurrentPage(result.pagination.currentPage);
        setTotalPages(result.pagination.totalPages);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', error.message || 'Failed to fetch student fees data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(
        getApiUrl('/api/student-fees/dashboard-summary'),
        {
          headers: {
            'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
          },
        }
      );

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Response is not JSON:', responseText);
        throw new Error('Server returned invalid response. Please check if the server is running.');
      }

      if (result.success) {
        setSummary(result.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  useEffect(() => {
    fetchData(1);
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [selectedSemester, selectedPaymentStatus]);

  const onRefresh = () => {
    fetchData(1, true);
    fetchSummary();
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchData(1);
  };

  const updatePaymentStatus = async (regNumber: string, newStatus: 'Paid' | 'Not Paid') => {
    try {
      const response = await fetch(
        getApiUrl(`/api/student-fees/student/${regNumber}/payment-status`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
          },
          body: JSON.stringify({ thisSemPaidOrNotPaid: newStatus }),
        }
      );

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Response is not JSON:', responseText);
        throw new Error('Server returned invalid response. Please check if the server is running.');
      }

      if (result.success) {
        // Update local state
        setStudents(prev => 
          prev.map(student => 
            student.regNumber === regNumber 
              ? { ...student, thisSemPaidOrNotPaid: newStatus }
              : student
          )
        );
        // Refresh summary
        fetchSummary();
        Alert.alert('Success', 'Payment status updated successfully');
      } else {
        throw new Error(result.error || 'Failed to update payment status');
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      Alert.alert('Error', error.message || 'Failed to update payment status');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading student fees data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Student Fees Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={24} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.totalStudents}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Students</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{summary.paidStudents}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paid</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <XCircle size={24} color="#EF4444" />
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{summary.unpaidStudents}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Unpaid</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DollarSign size={24} color="#F59E0B" />
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{formatCurrency(summary.totalDues)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Dues</Text>
          </View>
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                 <View style={styles.searchBox}>
           <Search size={20} color={colors.textSecondary} />
           <TextInput
             style={[styles.searchInput, { color: colors.text }]}
             placeholder="Search by name or reg number..."
             placeholderTextColor={colors.textSecondary}
             value={searchInput}
             onChangeText={setSearchInput}
             onSubmitEditing={handleSearch}
           />
           <TouchableOpacity
             style={[styles.searchButton, { backgroundColor: colors.primary }]}
             onPress={handleSearch}
           >
             <Search size={16} color="#FFFFFF" />
           </TouchableOpacity>
         </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: selectedSemester ? colors.primary : 'transparent',
                borderColor: colors.border 
              }
            ]}
            onPress={() => {
              const semesters = ['1 BCA', '2 BCA', '3 BCA', '4 BCA', '5 BCA', '6 BCA'];
              Alert.alert(
                'Select Semester',
                'Choose a semester to filter:',
                [
                  { text: 'All Semesters', onPress: () => setSelectedSemester('') },
                  ...semesters.map(sem => ({
                    text: sem,
                    onPress: () => setSelectedSemester(sem)
                  }))
                ]
              );
            }}
          >
            <Filter size={16} color={selectedSemester ? '#FFFFFF' : colors.text} />
            <Text style={[styles.filterText, { color: selectedSemester ? '#FFFFFF' : colors.text }]}>
              {selectedSemester || 'Semester'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              { 
                backgroundColor: selectedPaymentStatus ? colors.primary : 'transparent',
                borderColor: colors.border 
              }
            ]}
            onPress={() => {
              Alert.alert(
                'Select Payment Status',
                'Choose payment status to filter:',
                [
                  { text: 'All', onPress: () => setSelectedPaymentStatus('') },
                  { text: 'Paid', onPress: () => setSelectedPaymentStatus('Paid') },
                  { text: 'Not Paid', onPress: () => setSelectedPaymentStatus('Not Paid') }
                ]
              );
            }}
          >
            <Filter size={16} color={selectedPaymentStatus ? '#FFFFFF' : colors.text} />
            <Text style={[styles.filterText, { color: selectedPaymentStatus ? '#FFFFFF' : colors.text }]}>
              {selectedPaymentStatus || 'Status'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Students List */}
      <View style={styles.studentsContainer}>
        {students.map((student) => (
          <View key={student._id} style={[styles.studentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.studentHeader}>
              <View>
                <Text style={[styles.studentName, { color: colors.text }]}>{student.name}</Text>
                <Text style={[styles.studentReg, { color: colors.textSecondary }]}>{student.regNumber}</Text>
                <Text style={[styles.studentSemester, { color: colors.textSecondary }]}>{student.semester}</Text>
              </View>
              <View style={styles.paymentStatus}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: student.thisSemPaidOrNotPaid === 'Paid' ? '#10B981' : '#EF4444'
                    }
                  ]}
                  onPress={() => {
                    const newStatus = student.thisSemPaidOrNotPaid === 'Paid' ? 'Not Paid' : 'Paid';
                    updatePaymentStatus(student.regNumber, newStatus);
                  }}
                >
                  <Text style={styles.statusText}>
                    {student.thisSemPaidOrNotPaid}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.studentDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dues:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(student.dues)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Previous Payment:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{student.prevPaid}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => fetchData(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Text style={[styles.pageButtonText, { color: colors.text }]}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={[styles.pageInfo, { color: colors.text }]}>
            Page {currentPage} of {totalPages}
          </Text>
          
          <TouchableOpacity
            style={[styles.pageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => fetchData(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Text style={[styles.pageButtonText, { color: colors.text }]}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
     searchInput: {
     flex: 1,
     marginLeft: 8,
     marginRight: 8,
     fontSize: 16,
   },
   searchButton: {
     padding: 8,
     borderRadius: 8,
     alignItems: 'center',
     justifyContent: 'center',
   },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  studentsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  studentCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentReg: {
    fontSize: 14,
    marginBottom: 2,
  },
  studentSemester: {
    fontSize: 12,
  },
  paymentStatus: {
    alignItems: 'center',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  studentDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pageInfo: {
    fontSize: 14,
  },
});
