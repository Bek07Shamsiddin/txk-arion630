import { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { ServiceRecord, Tractor, User } from '@/lib/db/schema';
import type { RegulationLevel } from '@/lib/core/types';
import { byDateThenCreated } from '@/lib/services/tractors';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string }>();
  const tractorId = params.tractorId ? String(params.tractorId) : null;
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [levels, setLevels] = useState<RegulationLevel[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [rs, lvs, trs, us] = await Promise.all([
            db.serviceRecords.list(),
            db.regulation.list(),
            db.tractors.list(),
            db.users.list(),
          ]);
          if (!alive) return;
          setRecords(byDateThenCreated(tractorId ? rs.filter((r) => r.tractorId === tractorId) : rs).reverse());
          setLevels(lvs);
          setTractors(trs);
          setUsers(us);
        } catch (e) {
          showMessage(t.common.error, (e as Error).message || t.errors.storage);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [tractorId]),
  );

  if (!Permissions.canViewServiceHistory(user)) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <Text style={styles.empty}>{t.service.forbidden}</Text>
      </View>
    );
  }

  const levelName = (code: string) => levels.find((l) => l.code === code)?.name ?? t.service.unknownLevel;
  const tractorName = (id: string) => tractors.find((x) => x.id === id)?.model ?? '';
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '';

  return (
    <View style={styles.container}>
      <Header onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            Permissions.canAddServiceRecord(user) ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  router.push(tractorId ? `/add-service-record?tractorId=${encodeURIComponent(tractorId)}` : '/add-service-record')
                }
              >
                <Text style={styles.addText}>+ {t.service.add}</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>{t.service.historyEmpty}</Text>}
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.level}>{levelName(r.levelCode)}</Text>
                <Text style={styles.date}>{r.date}</Text>
              </View>
              <Text style={styles.meta}>
                {tractorName(r.tractorId)} · {t.service.atReading}: {fmt(r.reading)} {t.card.hoursUnit} ·{' '}
                {t.service.durationShort}: {fmt(r.durationHours)} {t.service.hoursUnit}
              </Text>
              {r.usedParts.length > 0 ? (
                <Text style={styles.meta}>
                  {t.service.parts}: {r.usedParts.map((p) => `${p.name} × ${fmt(p.quantity)}`).join(', ')}
                </Text>
              ) : null}
              {r.note ? <Text style={styles.note}>{r.note}</Text> : null}
              {r.photoUris.length > 0 ? (
                <View style={styles.photos}>
                  {r.photoUris.map((uri, i) => (
                    <Image key={uri + i} source={{ uri }} style={styles.photo} />
                  ))}
                </View>
              ) : null}
              {userName(r.userId) ? (
                <Text style={styles.by}>
                  {t.service.performedBy}: {userName(r.userId)}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={24} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.title}>{t.service.historyTitle}</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  title: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  placeholder: { width: 40 },
  list: { padding: 16, gap: 12 },
  empty: { padding: 24, fontSize: 15, color: '#6b7280', textAlign: 'center' },
  addButton: { backgroundColor: '#1f2937', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 4 },
  addText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  level: { fontSize: 16, fontWeight: '700', color: '#111827' },
  date: { fontSize: 14, color: '#6b7280' },
  meta: { fontSize: 13, color: '#4b5563' },
  note: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  photo: { width: 72, height: 72, borderRadius: 6, backgroundColor: '#e5e7eb' },
  by: { fontSize: 12, color: '#9ca3af' },
});
