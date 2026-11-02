import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { db } from '@/lib/db';
import type { MotoReading, ServiceRecord } from '@/lib/db/schema';
import { todayLocal } from '@/lib/core/dates';
import { getTractorView, type TractorView } from '@/lib/services/tractors';
import { forecastLine, remainingText, STATUS_COLORS } from '@/lib/tractorCard';
import { t } from '@/lib/i18n/uz';

const STATE_COLOR = { ok: STATUS_COLORS.green, soon: STATUS_COLORS.yellow, overdue: STATUS_COLORS.red } as const;
const fmt = (n: number) => String(Math.round(n * 10) / 10);
const newest = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1;

export default function TractorDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<TractorView | null>(null);
  const [readings, setReadings] = useState<MotoReading[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const v = await getTractorView(String(id), todayLocal());
          const [rs, ss] = await Promise.all([db.motoReadings.list(), db.serviceRecords.list()]);
          if (!alive) return;
          setFailed(false);
          setView(v);
          setReadings(rs.filter((r) => r.tractorId === v.tractor.id).sort(newest).slice(0, 5));
          setServices(ss.filter((s) => s.tractorId === v.tractor.id).sort(newest).slice(0, 5));
        } catch (e) {
          if (alive) {
            setView(null);
            setFailed(!/topilmadi/i.test((e as Error).message));
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const forecast = view ? forecastLine(view.forecast) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.tractor.detailsTitle}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      ) : !view ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{failed ? t.errors.generic : t.tractor.notFound}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {view.tractor.photoUri ? <Image source={{ uri: view.tractor.photoUri }} style={styles.photo} /> : null}
          <Text style={styles.model}>{view.tractor.model}</Text>
          <Text style={styles.muted}>
            {view.tractor.serialNumber} · {view.tractor.location} · {t.dashboard.operator}: {view.tractor.operatorName}
          </Text>
          <Text style={styles.muted}>
            {t.dashboard.currentReading}: {fmt(view.currentReading)} · {t.dashboard.equivHours}: {fmt(view.totalEquivHours)}
          </Text>
          {forecast ? (
            <Text style={styles.forecast}>
              {t.tractor.forecast}: {forecast}
            </Text>
          ) : null}
          {view.recommended ? (
            <Text style={styles.muted}>
              {t.tractor.recommended}: {view.recommended}
            </Text>
          ) : null}

          <Text style={styles.section}>{t.tractor.levelsTable}</Text>
          {view.statuses.map((st) => (
            <View key={st.code} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: STATE_COLOR[st.state] }]} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{st.name}</Text>
                <Text style={[styles.rowSub, { color: STATE_COLOR[st.state] }]}>
                  {t.tractor.states[st.state]} · {st.reason === 'calendar' ? t.tractor.reasons.calendar : remainingText(st)}
                </Text>
              </View>
            </View>
          ))}

          <Text style={styles.section}>{t.tractor.recentReadings}</Text>
          {readings.length === 0 ? <Text style={styles.muted}>{t.tractor.noRecords}</Text> : null}
          {readings.map((r) => (
            <Text key={r.id} style={styles.rowTitle}>
              {r.date} · {fmt(r.reading)} {t.card.hoursUnit} · +{fmt(r.physHours)} ({fmt(r.equivHours)} {t.card.equivShort})
            </Text>
          ))}

          <Text style={styles.section}>{t.tractor.recentServices}</Text>
          {services.length === 0 ? <Text style={styles.muted}>{t.tractor.noRecords}</Text> : null}
          {services.map((s) => (
            <Text key={s.id} style={styles.rowTitle}>
              {s.date} · {s.levelCode} · {fmt(s.reading)} {t.card.hoursUnit}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 6, paddingBottom: 32 },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#e5e7eb', marginBottom: 8 },
  model: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  muted: { fontSize: 14, color: '#6b7280' },
  forecast: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  section: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, color: '#1f2937' },
  rowSub: { fontSize: 12 },
});
