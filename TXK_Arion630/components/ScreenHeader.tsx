import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

type Props = { title: string; onBack: () => void; right?: { label: string; onPress: () => void } };

/** Ekran sarlavhasi: orqaga tugmasi, nom va ixtiyoriy o'ng havola. */
export function ScreenHeader({ title, onBack, right }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={24} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {right ? (
        <TouchableOpacity onPress={right.onPress} style={styles.right}>
          <Text style={styles.rightText}>{right.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#ffffff', flex: 1, textAlign: 'center' },
  placeholder: { width: 40 },
  right: { padding: 8 },
  rightText: { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
});
