import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { PartsUsageStats } from '@/lib/reports';

interface Props {
  data: PartsUsageStats[];
}

export function PartsUsageReport({ data }: Props) {
  const screenWidth = Dimensions.get('window').width;

  const topParts = data.slice(0, 5);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const chartData = topParts.map((item, index) => ({
    name: item.partName.substring(0, 12),
    quantity: item.totalQuantity,
    color: colors[index % colors.length],
    legendFontColor: '#1f2937',
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Parts Usage Report</Text>
      <Text style={styles.subtitle}>Most requested parts and usage statistics</Text>

      {data.length > 0 ? (
        <>
          <View style={styles.chartContainer}>
            <PieChart
              data={chartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              accessor="quantity"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colPart]}>Part Name</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colReq]}>Requests</Text>
              <Text style={[styles.tableHeaderText, styles.colPending]}>Pending</Text>
              <Text style={[styles.tableHeaderText, styles.colDelivered]}>Delivered</Text>
            </View>

            {data.map((item, index) => (
              <View
                key={item.partName}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
              >
                <Text style={[styles.tableCell, styles.colPart]} numberOfLines={2}>
                  {item.partName}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.totalQuantity}
                </Text>
                <Text style={[styles.tableCell, styles.colReq]}>
                  {item.requestCount}
                </Text>
                <Text style={[styles.tableCell, styles.colPending]}>
                  {item.pendingCount}
                </Text>
                <Text style={[styles.tableCell, styles.colDelivered]}>
                  {item.deliveredCount}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Parts</Text>
              <Text style={styles.summaryValue}>{data.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Requests</Text>
              <Text style={styles.summaryValue}>
                {data.reduce((sum, p) => sum + p.requestCount, 0)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Quantity</Text>
              <Text style={styles.summaryValue}>
                {data.reduce((sum, p) => sum + p.totalQuantity, 0)}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.noData}>No data available</Text>
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
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    paddingVertical: 16,
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
  colPart: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'right',
  },
  colReq: {
    flex: 1,
    textAlign: 'right',
  },
  colPending: {
    flex: 1,
    textAlign: 'right',
  },
  colDelivered: {
    flex: 1,
    textAlign: 'right',
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
    color: '#1f2937',
  },
  noData: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 40,
  },
});
