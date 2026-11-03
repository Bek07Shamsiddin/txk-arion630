import { View, Text, StyleSheet } from 'react-native';
import { t } from '@/lib/i18n/uz';

export type Column<T> = { header: string; flex?: number; align?: 'left' | 'right'; cell: (row: T) => string };

type Props<T> = { columns: Column<T>[]; rows: T[]; keyOf: (row: T, i: number) => string };

/** Oddiy jadval: sarlavha qatori va ma'lumot qatorlari. */
export function ReportTable<T>({ columns, rows, keyOf }: Props<T>) {
  if (rows.length === 0) return <Text style={styles.empty}>{t.reports.noData}</Text>;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.head]}>
        {columns.map((c, ci) => (
          <Text key={ci} style={[styles.cell, styles.headText, { flex: c.flex ?? 1, textAlign: c.align ?? 'left' }]}>
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={keyOf(r, i)} style={styles.row}>
          {columns.map((c, ci) => (
            <Text key={ci} style={[styles.cell, { flex: c.flex ?? 1, textAlign: c.align ?? 'left' }]}>
              {c.cell(r)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#ffffff', overflow: 'hidden' },
  row: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  head: { backgroundColor: '#f9fafb', borderTopWidth: 0 },
  cell: { fontSize: 13, color: '#111827', paddingHorizontal: 4 },
  headText: { fontWeight: '700', color: '#374151' },
  empty: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 24 },
});
