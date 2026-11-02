import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { ServiceOverdueItem } from '@/lib/reports';

interface Props {
  data: ServiceOverdueItem[];
}

export function ServiceOverdueReport({ data }: Props) {
  const getSeverityColor = (hoursOverdue: number) => {
    if (hoursOverdue > 50) return '#ef4444';
    if (hoursOverdue > 20) return '#f59e0b';
    return '#10b981';
  };

  const getSeverityLabel = (hoursOverdue: number) => {
    if (hoursOverdue > 50) return 'Critical';
    if (hoursOverdue > 20) return 'High';
    return 'Normal';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Service Overdue Report</Text>
      <Text style={styles.subtitle}>Tractors requiring immediate service attention</Text>

      {data.length > 0 ? (
        <>
          <View style={styles.alertBox}>
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.alertText}>
              {data.length} tractor{data.length > 1 ? 's' : ''} overdue for service
            </Text>
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colModel]}>Model</Text>
              <Text style={[styles.tableHeaderText, styles.colSerial]}>Serial</Text>
              <Text style={[styles.tableHeaderText, styles.colLocation]}>Location</Text>
              <Text style={[styles.tableHeaderText, styles.colHours]}>Overdue</Text>
              <Text style={[styles.tableHeaderText, styles.colSeverity]}>Priority</Text>
            </View>

            {data.map((item, index) => (
              <View
                key={item.tractorId}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
              >
                <Text style={[styles.tableCell, styles.colModel]} numberOfLines={1}>
                  {item.model}
                </Text>
                <Text style={[styles.tableCell, styles.colSerial]} numberOfLines={1}>
                  {item.serialNumber}
                </Text>
                <Text style={[styles.tableCell, styles.colLocation]} numberOfLines={1}>
                  {item.location}
                </Text>
                <Text style={[styles.tableCell, styles.colHours]}>
                  {item.hoursOverdue}h
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.hoursOverdue) + '20' }]}>
                  <Text style={[styles.severityText, { color: getSeverityColor(item.hoursOverdue) }]}>
                    {getSeverityLabel(item.hoursOverdue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Critical</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                {data.filter((t) => t.hoursOverdue > 50).length}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>High</Text>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                {data.filter((t) => t.hoursOverdue > 20 && t.hoursOverdue <= 50).length}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Normal</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {data.filter((t) => t.hoursOverdue <= 20).length}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataTitle}>All Clear!</Text>
          <Text style={styles.noData}>No tractors are overdue for service</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 13,
    color: '#1f2937',
  },
  colModel: {
    flex: 2,
  },
  colSerial: {
    flex: 2,
  },
  colLocation: {
    flex: 2,
  },
  colHours: {
    flex: 1,
    textAlign: 'right',
  },
  colSeverity: {
    flex: 1.5,
  },
  severityBadge: {
    flex: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  noDataContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 8,
  },
  noData: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
});
