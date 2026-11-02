import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Printer, FileText, Package, Users, AlertCircle } from 'lucide-react-native';
import { MotoHourStatsReport } from '@/components/reports/MotoHourStatsReport';
import { PartsUsageReport } from '@/components/reports/PartsUsageReport';
import { TechnicianPerformanceReport } from '@/components/reports/TechnicianPerformanceReport';
import { ServiceOverdueReport } from '@/components/reports/ServiceOverdueReport';
import {
  getTractorMotoHourStats,
  getPartsUsageStats,
  getTechnicianPerformance,
  getServiceOverdueList,
  TractorMotoHourStats,
  PartsUsageStats,
  TechnicianPerformance,
  ServiceOverdueItem,
} from '@/lib/reports';

type ReportType = 'motoHours' | 'parts' | 'technicians' | 'overdue';

interface ReportData {
  motoHours: TractorMotoHourStats[];
  parts: PartsUsageStats[];
  technicians: TechnicianPerformance[];
  overdue: ServiceOverdueItem[];
}

export default function ReportsScreen() {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState<ReportType>('motoHours');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    motoHours: [],
    parts: [],
    technicians: [],
    overdue: [],
  });

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [motoHours, parts, technicians, overdue] = await Promise.all([
        getTractorMotoHourStats(),
        getPartsUsageStats(),
        getTechnicianPerformance(),
        getServiceOverdueList(),
      ]);

      setReportData({
        motoHours,
        parts,
        technicians,
        overdue,
      });
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    }
  };

  const renderReport = () => {
    switch (activeReport) {
      case 'motoHours':
        return <MotoHourStatsReport data={reportData.motoHours} />;
      case 'parts':
        return <PartsUsageReport data={reportData.parts} />;
      case 'technicians':
        return <TechnicianPerformanceReport data={reportData.technicians} />;
      case 'overdue':
        return <ServiceOverdueReport data={reportData.overdue} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity onPress={handlePrint} style={styles.printButton}>
            <Printer size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
        {Platform.OS !== 'web' && <View style={styles.placeholder} />}
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeReport === 'motoHours' && styles.tabActive]}
          onPress={() => setActiveReport('motoHours')}
          activeOpacity={0.7}
        >
          <FileText
            size={18}
            color={activeReport === 'motoHours' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeReport === 'motoHours' && styles.tabTextActive,
            ]}
          >
            Moto Hours
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeReport === 'parts' && styles.tabActive]}
          onPress={() => setActiveReport('parts')}
          activeOpacity={0.7}
        >
          <Package
            size={18}
            color={activeReport === 'parts' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[styles.tabText, activeReport === 'parts' && styles.tabTextActive]}
          >
            Parts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeReport === 'technicians' && styles.tabActive]}
          onPress={() => setActiveReport('technicians')}
          activeOpacity={0.7}
        >
          <Users
            size={18}
            color={activeReport === 'technicians' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeReport === 'technicians' && styles.tabTextActive,
            ]}
          >
            Technicians
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeReport === 'overdue' && styles.tabActive]}
          onPress={() => setActiveReport('overdue')}
          activeOpacity={0.7}
        >
          <AlertCircle
            size={18}
            color={activeReport === 'overdue' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeReport === 'overdue' && styles.tabTextActive,
            ]}
          >
            Overdue
          </Text>
          {reportData.overdue.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reportData.overdue.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReportData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.reportContainer}>{renderReport()}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  printButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportContainer: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
