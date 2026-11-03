import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { MotoReading } from '@/lib/db/schema';
import type { OperationType } from '@/lib/core/types';
import { parseDecimal } from '@/lib/core/numbers';
import { isIsoDate, todayLocal } from '@/lib/core/dates';
import { byDateThenCreated, listTractorViews, type TractorView } from '@/lib/services/tractors';
import { deleteMotoReading, recordMotoReading } from '@/lib/services/motoReadings';
import { buildShares, physHoursPreview, readingErrorMessage, sharesSum, type ShareRow } from '@/lib/motoForm';
import { TractorPicker } from '@/components/TractorPicker';
import { confirmAction, showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export default function AddMotoHoursScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string }>();
  const [views, setViews] = useState<TractorView[]>([]);
  const [ops, setOps] = useState<OperationType[]>([]);
  const [recent, setRecent] = useState<MotoReading[]>([]);
  const [tractorId, setTractorId] = useState<string | null>(params.tractorId ? String(params.tractorId) : null);
  const [date, setDate] = useState(todayLocal());
  const [reading, setReading] = useState('');
  const [rows, setRows] = useState<ShareRow[]>([{ operationTypeId: '', hours: '' }]);
  const [fuel, setFuel] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [vs, o, rs] = await Promise.all([
        listTractorViews(todayLocal()),
        db.operationTypes.list(),
        db.motoReadings.list(),
      ]);
      setViews(vs);
      setOps(o);
      setRecent(rs);
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!tractorId && views.length === 1) setTractorId(views[0].tractor.id);
  }, [views, tractorId]);

  if (!Permissions.canLogMotoHours(user)) {
    return (
      <View style={styles.container}>
        <Header onBack={() => goBack(router)} />
        <Text style={styles.forbidden}>{t.hours.forbidden}</Text>
      </View>
    );
  }

  const view = views.find((v) => v.tractor.id === tractorId) ?? null;
  const phys = view ? physHoursPreview(reading, view.currentReading) : null;
  const tractorReadings = tractorId ? byDateThenCreated(recent.filter((r) => r.tractorId === tractorId)) : [];
  const lastReading = tractorReadings.length ? tractorReadings[tractorReadings.length - 1] : null;
  const singleRow = rows.length === 1;
  const opName = (id: string) => ops.find((o) => o.id === id)?.name ?? id;

  const setRow = (i: number, patch: Partial<ShareRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    if (!user || !view) return;
    const e: Record<string, string> = {};
    if (!isIsoDate(date.trim())) e.date = t.hours.badDate;
    const readingNum = parseDecimal(reading);
    if (readingNum === null || readingNum < 0) e.reading = readingErrorMessage('not_number');
    const shares = buildShares(rows);
    if (!shares) e.shares = t.hours.pickOperation;
    let fuelLiters: number | null = null;
    if (fuel.trim() !== '') {
      fuelLiters = parseDecimal(fuel);
      if (fuelLiters === null || fuelLiters <= 0) e.fuel = readingErrorMessage('not_number');
    }
    setErrors(e);
    if (Object.keys(e).length > 0 || readingNum === null || !shares) return;

    setSaving(true);
    try {
      const input = {
        tractorId: view.tractor.id,
        date: date.trim(),
        reading: readingNum,
        shares,
        fuelLiters,
        note: note.trim() || null,
        userId: user.id,
      };
      let res = await recordMotoReading(input);
      if (!res.ok && res.error === 'over_24h_needs_confirm') {
        const yes = await confirmAction(t.hours.confirmTitle, readingErrorMessage(res.error));
        if (!yes) return;
        res = await recordMotoReading({ ...input, confirmOver24h: true });
      }
      if (!res.ok) {
        showMessage(t.common.error, readingErrorMessage(res.error));
        return;
      }
      goBack(router);
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
    }
  };

  const removeLast = async () => {
    if (!lastReading) return;
    const yes = await confirmAction(t.hours.deleteTitle, t.hours.deleteQuestion);
    if (!yes) return;
    try {
      await deleteMotoReading(lastReading.id);
      await load();
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    }
  };

  return (
    <View style={styles.container}>
      <Header onBack={() => goBack(router)} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.group}>
            <Text style={styles.label}>{t.hours.tractor}</Text>
            <TractorPicker views={views} selectedId={tractorId} onSelect={setTractorId} />
          </View>

          {view ? (
            <>
              <View style={styles.group}>
                <Text style={styles.label}>{t.hours.date}</Text>
                <TextInput
                  style={[styles.input, errors.date ? styles.inputError : null]}
                  value={date}
                  onChangeText={setDate}
                />
                {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.hours.reading}</Text>
                <TextInput
                  style={[styles.input, errors.reading ? styles.inputError : null]}
                  value={reading}
                  onChangeText={setReading}
                  keyboardType="decimal-pad"
                />
                {errors.reading ? <Text style={styles.error}>{errors.reading}</Text> : null}
                <View style={styles.info}>
                  <Text style={styles.infoText}>
                    {t.hours.previous}: {fmt(view.currentReading)} {t.card.hoursUnit}
                  </Text>
                  <Text style={styles.infoText}>
                    {t.hours.physHours}: {phys !== null ? `${fmt(phys)} ${t.service.hoursUnit}` : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.hours.shares}</Text>
                {rows.map((r, i) => (
                  <View key={i} style={styles.shareRow}>
                    <View style={styles.opList}>
                      {ops.length === 0 ? <Text style={styles.empty}>{t.hours.noOperationTypes}</Text> : null}
                      {ops.map((o) => {
                        const on = r.operationTypeId === o.id;
                        return (
                          <TouchableOpacity
                            key={o.id}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => setRow(i, { operationTypeId: o.id })}
                          >
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.name}</Text>
                            {!o.verified ? <Text style={styles.tag}>{t.hours.unverified}</Text> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.shareControls}>
                      <TextInput
                        style={[styles.input, styles.hoursInput]}
                        value={r.hours}
                        onChangeText={(v) => setRow(i, { hours: v })}
                        keyboardType="decimal-pad"
                        placeholder={singleRow ? t.hours.shareHoursAuto : t.hours.shareHours}
                      />
                      {!singleRow ? (
                        <TouchableOpacity onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                          <Text style={styles.link}>{t.hours.removeShare}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
                {errors.shares ? <Text style={styles.error}>{errors.shares}</Text> : null}
                <TouchableOpacity onPress={() => setRows((rs) => [...rs, { operationTypeId: '', hours: '' }])}>
                  <Text style={styles.link}>+ {t.hours.addShare}</Text>
                </TouchableOpacity>
                {!singleRow && phys !== null ? (
                  <Text style={styles.infoText}>
                    {fmt(sharesSum(rows))} / {fmt(phys)} {t.service.hoursUnit}
                  </Text>
                ) : null}
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.hours.fuel}</Text>
                <TextInput
                  style={[styles.input, errors.fuel ? styles.inputError : null]}
                  value={fuel}
                  onChangeText={setFuel}
                  keyboardType="decimal-pad"
                />
                {errors.fuel ? <Text style={styles.error}>{errors.fuel}</Text> : null}
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.hours.note}</Text>
                <TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} multiline />
              </View>

              <TouchableOpacity
                style={[styles.submit, saving && styles.submitDisabled]}
                onPress={submit}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>{t.hours.save}</Text>}
              </TouchableOpacity>

              {tractorReadings.length > 0 ? (
                <View style={[styles.group, { marginTop: 24 }]}>
                  <Text style={styles.label}>{t.hours.recent}</Text>
                  {[...tractorReadings]
                    .reverse()
                    .slice(0, 5)
                    .map((r) => (
                      <View key={r.id} style={styles.recentRow}>
                        <Text style={styles.recentText}>
                          {r.date} · {fmt(r.reading)} {t.card.hoursUnit} (+{fmt(r.physHours)})
                        </Text>
                        <Text style={styles.recentSub}>
                          {r.shares.map((s) => `${opName(s.operationTypeId)} ${fmt(s.hours)}`).join(', ')}
                        </Text>
                      </View>
                    ))}
                  <TouchableOpacity style={styles.deleteBtn} onPress={removeLast}>
                    <Text style={styles.deleteText}>{t.hours.deleteLast}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
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
      <Text style={styles.title}>{t.hours.title}</Text>
      <View style={styles.placeholder} />
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
  scroll: { padding: 16, paddingBottom: 48 },
  forbidden: { padding: 24, fontSize: 16, color: '#6b7280', textAlign: 'center' },
  group: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#ffffff' },
  inputError: { borderColor: '#ef4444' },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  error: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  info: { backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, marginTop: 8, gap: 2 },
  infoText: { fontSize: 13, color: '#1e40af' },
  shareRow: { marginBottom: 12, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  opList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextOn: { color: '#ffffff' },
  tag: { fontSize: 10, color: '#92400e', backgroundColor: '#fef3c7', paddingHorizontal: 4, borderRadius: 4 },
  shareControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursInput: { flex: 1 },
  link: { color: '#2563eb', fontSize: 14, paddingVertical: 6 },
  empty: { color: '#6b7280', fontSize: 14 },
  submit: { backgroundColor: '#1f2937', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  recentRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  recentText: { fontSize: 14, color: '#111827' },
  recentSub: { fontSize: 12, color: '#6b7280' },
  deleteBtn: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center' },
  deleteText: { color: '#ef4444', fontWeight: '600' },
});
