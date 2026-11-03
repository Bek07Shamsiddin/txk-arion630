import { View, Text, StyleSheet } from 'react-native';
import type { StrategySummary } from '@/lib/core/simulator';
import { resultRows, type ResultRow } from '@/lib/simForm';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from '@/components/reports/ReportTable';

/** Natija jadvali: ko'rsatkich | S1 | S2 | farq; har bir S katakchasi "o'rtacha [lo; hi]". */
export function ResultTable({ s1, s2 }: { s1: StrategySummary; s2: StrategySummary }) {
  return (
    <View>
      <ReportTable<ResultRow>
        rows={resultRows(s1, s2)}
        keyOf={(r) => r.key}
        columns={[
          { header: t.sim.indicator, flex: 2, cell: (r) => r.label },
          { header: t.sim.s1, flex: 3, align: 'right', cell: (r) => r.s1 },
          { header: t.sim.s2, flex: 3, align: 'right', cell: (r) => r.s2 },
          { header: t.sim.diff, flex: 2, align: 'right', cell: (r) => r.diff },
        ]}
      />
      <Text style={styles.legend}>{t.sim.s1Desc}</Text>
      <Text style={styles.legend}>{t.sim.s2Desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
