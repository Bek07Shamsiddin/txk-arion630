import { View, Text, StyleSheet } from 'react-native';
import type { Stat } from '@/lib/core/simulator';
import { chartScale, fmtMoney } from '@/lib/simForm';
import { t } from '@/lib/i18n/uz';

const HEIGHT = 180;
const DOT = 8;

type Point = { beta: number; costDiff: Stat };

/** β bo'yicha xarajat farqi (S2 − S1): o'rtacha nuqta, lo/hi mo'ylovlar va 0 chizig'i. */
export function SensitivityChart({ data }: { data: Point[] }) {
  const sc = chartScale(data);
  const y = (v: number) => sc.pos(v) * HEIGHT;
  return (
    <View>
      <Text style={styles.title}>{t.sim.chartTitle}</Text>
      <View style={styles.row}>
        <View style={styles.axis}>
          <Text style={styles.axisText}>{fmtMoney(sc.max)}</Text>
          <Text style={styles.axisText}>{fmtMoney(sc.min)}</Text>
        </View>
        <View style={styles.plot}>
          <View style={[styles.zero, { top: y(0) }]} />
          {data.map((p) => {
            const top = y(p.costDiff.hi);
            const height = Math.max(1, y(p.costDiff.lo) - top);
            return (
              <View key={p.beta} style={styles.col}>
                <View style={[styles.whisker, { top, height }]} />
                <View style={[styles.cap, { top }]} />
                <View style={[styles.cap, { top: top + height }]} />
                <View style={[styles.dot, { top: y(p.costDiff.mean) - DOT / 2 }]} />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.labels}>
        <View style={styles.axis} />
        <View style={styles.labelsRow}>
          {data.map((p) => (
            <View key={p.beta} style={styles.labelCol}>
              <Text style={styles.beta}>β = {p.beta}</Text>
              <Text style={styles.value}>{fmtMoney(p.costDiff.mean)}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.caption}>{t.sim.chartCaption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row' },
  axis: { width: 78, height: HEIGHT, justifyContent: 'space-between', paddingRight: 4 },
  axisText: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
  plot: { flex: 1, height: HEIGHT, flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 4 },
  zero: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#111827' },
  col: { flex: 1, height: HEIGHT, alignItems: 'center' },
  whisker: { position: 'absolute', width: 2, backgroundColor: '#3b82f6' },
  cap: { position: 'absolute', width: 12, height: 2, backgroundColor: '#3b82f6' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#f59e0b' },
  labels: { flexDirection: 'row', marginTop: 4 },
  labelsRow: { flex: 1, flexDirection: 'row' },
  labelCol: { flex: 1, alignItems: 'center' },
  beta: { fontSize: 11, color: '#374151', fontWeight: '600' },
  value: { fontSize: 10, color: '#6b7280' },
  caption: { fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' },
});
