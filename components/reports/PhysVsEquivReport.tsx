import { View, Text, StyleSheet } from 'react-native';
import type { PhysVsEquivRow } from '@/lib/reports';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from './ReportTable';

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function loadFlag(r: PhysVsEquivRow): string {
  if (r.phys <= 0) return '';
  if (r.ratio > 1.15) return t.reports.overloaded;
  if (r.ratio < 0.85) return t.reports.underloaded;
  return '';
}

/** Har bir traktor uchun fizik va keltirilgan soatlar ustunlari + jadval. */
export function PhysVsEquivReport({ data }: { data: PhysVsEquivRow[] }) {
  const max = Math.max(1, ...data.map((r) => Math.max(r.phys, r.equiv)));
  return (
    <View>
      {data.length > 0 && (
        <View style={styles.chart}>
          {data.map((r) => (
            <View key={r.tractorId} style={styles.group}>
              <View style={styles.bars}>
                <View style={[styles.bar, { height: `${(r.phys / max) * 100}%`, backgroundColor: '#3b82f6' }]} />
                <View style={[styles.bar, { height: `${(r.equiv / max) * 100}%`, backgroundColor: '#f59e0b' }]} />
              </View>
              <Text style={styles.label} numberOfLines={1}>{r.model}</Text>
            </View>
          ))}
        </View>
      )}
      {data.length > 0 && (
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: '#3b82f6' }]}>■ {t.reports.phys}</Text>
          <Text style={[styles.legendText, { color: '#f59e0b' }]}>■ {t.reports.equiv}</Text>
        </View>
      )}
      <ReportTable
        rows={data}
        keyOf={(r) => r.tractorId}
        columns={[
          { header: t.reports.model, flex: 2, cell: (r) => r.model },
          { header: t.reports.phys, align: 'right', cell: (r) => f1(r.phys) },
          { header: t.reports.equiv, align: 'right', cell: (r) => f1(r.equiv) },
          { header: t.reports.ratio, align: 'right', cell: (r) => r.ratio.toFixed(2) },
          { header: '', flex: 2, cell: loadFlag },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', height: 160, alignItems: 'flex-end', gap: 12, paddingBottom: 4, marginBottom: 8 },
  group: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, minHeight: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  label: { fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 4 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendText: { fontSize: 12, fontWeight: '600' },
});
