import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { TractorMotoHourStats } from '@/lib/reports';

interface Props {
  data: TractorMotoHourStats[];
}

export function MotoHourStatsReport({ data }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  const topTractors = data.slice(0, 10);
  const chartData = {
    labels: topTractors.map((item) => item.model.substring(0, 8)),
    datasets: [
      {
        data: topTractors.length > 0 ? topTractors.map((item) => item.currentMotoHours) : [0],
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 8,
    },
    propsForLabels: {
      fontSize: 10,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
    },
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tractor Moto-Hour Statistics</Text>
      <Text style={styles.subtitle}>Current moto-hours across all tractors</Text>

      {data.length > 0 ? (
        <>
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={chartWidth}
              height={240}
              chartConfig={chartConfig}
              verticalLabelRotation={45}
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars
              fromZero
              style={styles.chart}
            />
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colModel]}>Model</Text>
              <Text style={[styles.tableHeaderText, styles.colSerial]}>Serial</Text>
              <Text style={[styles.tableHeaderText, styles.colHours]}>Hours</Text>
              <Text style={[styles.tableHeaderText, styles.colAvg]}>Avg/Day</Text>
              <Text style={[styles.tableHeaderText, styles.colLogs]}>Logs</Text>
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
                <Text style={[styles.tableCell, styles.colHours]}>
                  {item.currentMotoHours}
                </Text>
                <Text style={[styles.tableCell, styles.colAvg]}>
                  {item.averageHoursPerDay.toFixed(1)}
                </Text>
                <Text style={[styles.tableCell, styles.colLogs]}>
                  {item.logCount}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Tractors</Text>
              <Text style={styles.summaryValue}>{data.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>
                {data.reduce((sum, t) => sum + t.currentMotoHours, 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Hours</Text>
              <Text style={styles.summaryValue}>
                {Math.round(
                  data.reduce((sum, t) => sum + t.currentMotoHours, 0) / data.length
                )}
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
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    borderRadius: 8,
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
  colModel: {
    flex: 2,
  },
  colSerial: {
    flex: 2,
  },
  colHours: {
    flex: 1,
    textAlign: 'right',
  },
  colAvg: {
    flex: 1,
    textAlign: 'right',
  },
  colLogs: {
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
