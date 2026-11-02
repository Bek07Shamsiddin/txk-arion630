import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { t } from '@/lib/i18n/uz';
import type { TractorView } from '@/lib/services/tractors';
import { cardStatusLine, forecastLine, STATUS_COLORS } from '@/lib/tractorCard';

interface TractorCardProps {
  view: TractorView;
  onPress: () => void;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export function TractorCard({ view, onPress }: TractorCardProps) {
  const { tractor } = view;
  const statusColor = STATUS_COLORS[view.color];
  const statusLine = cardStatusLine(view.next);
  const forecast = forecastLine(view.forecast);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.model}>{tractor.model}</Text>
            <Text style={styles.serial}>{tractor.serialNumber}</Text>
          </View>
          {tractor.photoUri ? <Image source={{ uri: tractor.photoUri }} style={styles.photo} /> : null}
        </View>

        <View style={styles.statusSection}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLine ?? t.dashboard.noLevels}
          </Text>
          {forecast ? <Text style={styles.statusSubtext}>{forecast}</Text> : null}
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>{t.dashboard.currentReading}</Text>
            <Text style={styles.metricValue}>{fmt(view.currentReading)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>{t.dashboard.equivHours}</Text>
            <Text style={styles.metricValue}>{fmt(view.totalEquivHours)}</Text>
          </View>
        </View>

        <Text style={styles.location}>
          {tractor.location} · {t.dashboard.operator}: {tractor.operatorName}
        </Text>
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
