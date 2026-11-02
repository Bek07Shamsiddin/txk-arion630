import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Package, Wrench } from 'lucide-react-native';
import { Tractor } from '@/lib/types';
import { getTractorServiceStatus, getStatusColor } from '@/lib/tractorStatus';
import { TractorLiveData } from '@/lib/liveMonitoring';

interface TractorCardProps {
  tractor: Tractor;
  lastServiceDate?: string;
  liveData?: TractorLiveData;
  onPress: () => void;
}

export function TractorCard({ tractor, lastServiceDate, liveData, onPress }: TractorCardProps) {
  const status = getTractorServiceStatus(tractor);
  const statusColor = getStatusColor(status.color);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.model}>{tractor.model}</Text>
            <Text style={styles.serial}>{tractor.serial_number}</Text>
          </View>
          <View style={styles.headerRight}>
            {tractor.photo_url && (
              <Image
                source={{ uri: tractor.photo_url }}
                style={styles.photo}
              />
            )}
            {liveData && (liveData.pendingPartsCount > 0 || liveData.activeCallsCount > 0) && (
              <View style={styles.alertBadges}>
                {liveData.pendingPartsCount > 0 && (
                  <View style={styles.alertBadge}>
                    <Package size={12} color="#f59e0b" />
                    <Text style={styles.alertBadgeText}>{liveData.pendingPartsCount}</Text>
                  </View>
                )}
                {liveData.activeCallsCount > 0 && (
                  <View style={styles.alertBadge}>
                    <Wrench size={12} color="#3b82f6" />
                    <Text style={styles.alertBadgeText}>{liveData.activeCallsCount}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {status.label}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.statusSubtext}>
            {liveData
              ? liveData.isOverdue
                ? `Overdue by ${tractor.current_moto_hours - tractor.next_service_hours}h`
                : `${liveData.hoursUntilService}h until service`
              : status.hoursUntilService > 0
              ? `${status.hoursUntilService}h until next service`
              : 'Service overdue'}
          </Text>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Current Hours</Text>
            <Text style={styles.metricValue}>{tractor.current_moto_hours.toLocaleString()}</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Next Service</Text>
            <Text style={styles.metricValue}>{tractor.next_service_hours.toLocaleString()}</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Last Service</Text>
            <Text style={styles.metricValue}>
              {lastServiceDate ? new Date(lastServiceDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        <Text style={styles.location}>{tractor.location}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBar: {
    height: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  model: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  serial: {
    fontSize: 13,
    color: '#6b7280',
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  alertBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusSection: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  location: {
    fontSize: 12,
    color: '#6b7280',
  },
});
