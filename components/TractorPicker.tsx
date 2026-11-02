import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { TractorView } from '@/lib/services/tractors';
import { t } from '@/lib/i18n/uz';

type Props = {
  views: TractorView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Traktor tanlash ro'yxati (route param bo'lmaganda ko'rsatiladi). */
export function TractorPicker({ views, selectedId, onSelect }: Props) {
  if (views.length === 0) return <Text style={styles.empty}>{t.hours.noTractors}</Text>;
  return (
    <View style={styles.wrap}>
      {views.map((v) => {
        const on = v.tractor.id === selectedId;
        return (
          <TouchableOpacity
            key={v.tractor.id}
            style={[styles.item, on && styles.itemOn]}
            onPress={() => onSelect(v.tractor.id)}
          >
            <Text style={[styles.text, on && styles.textOn]}>
              {v.tractor.model} · {v.tractor.serialNumber}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, backgroundColor: '#ffffff' },
  itemOn: { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  text: { fontSize: 15, color: '#374151' },
  textOn: { color: '#ffffff', fontWeight: '600' },
  empty: { color: '#6b7280', fontSize: 14 },
});
