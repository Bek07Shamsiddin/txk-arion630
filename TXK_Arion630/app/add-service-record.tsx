import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { RegulationLevel } from '@/lib/core/types';
import { parseDecimal } from '@/lib/core/numbers';
import { isIsoDate, todayLocal } from '@/lib/core/dates';
import { listTractorViews, type TractorView } from '@/lib/services/tractors';
import { recordService } from '@/lib/services/service';
import { parseUsedParts, prefillParts, type PartRow } from '@/lib/serviceForm';
import { saveImage } from '@/lib/media';
import { TractorPicker } from '@/components/TractorPicker';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

export default function AddServiceRecordScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string; levelCode?: string }>();
  const [views, setViews] = useState<TractorView[]>([]);
  const [levels, setLevels] = useState<RegulationLevel[]>([]);
  const [tractorId, setTractorId] = useState<string | null>(params.tractorId ? String(params.tractorId) : null);
  const [levelCode, setLevelCode] = useState<string | null>(params.levelCode ? String(params.levelCode) : null);
  const [date, setDate] = useState(todayLocal());
  const [duration, setDuration] = useState('');
  const [parts, setParts] = useState<PartRow[]>([]);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState(false);

  const view = views.find((v) => v.tractor.id === tractorId) ?? null;

  const chooseLevel = useCallback((code: string, list: RegulationLevel[]) => {
    const lv = list.find((l) => l.code === code);
    setLevelCode(code);
    setPicked(true);
    setDuration(lv ? String(lv.durationHours) : '');
    setParts(prefillParts(lv));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [vs, lvs] = await Promise.all([listTractorViews(todayLocal()), db.regulation.list()]);
          if (!alive) return;
          setViews(vs);
          setLevels(lvs);
        } catch (e) {
          showMessage(t.common.error, (e as Error).message || t.errors.storage);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!tractorId && views.length === 1) setTractorId(views[0].tractor.id);
  }, [views, tractorId]);

  // Daraja hali tanlanmagan bo'lsa: tavsiya etilganini (yoki param bergan darajani) oldindan tanlaydi.
  useEffect(() => {
    if (levels.length === 0 || picked) return;
    const code = levelCode ?? view?.recommended ?? null;
    if (code && levels.some((l) => l.code === code)) chooseLevel(code, levels);
  }, [levels, view, levelCode, picked, chooseLevel]);

  if (!Permissions.canAddServiceRecord(user)) {
    return (
      <View style={styles.container}>
        <Header onBack={() => goBack(router)} />
        <Text style={styles.forbidden}>{t.service.forbidden}</Text>
      </View>
    );
  }

  const pick = async (camera: boolean) => {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) {
        const uri = await saveImage(res.assets[0].uri);
        setPhotos((p) => [...p, uri]);
      }
    } catch (e) {
      showMessage(t.common.error, (e as Error).message);
    }
  };

  const setPart = (i: number, patch: Partial<PartRow>) =>
    setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async () => {
    if (!user || !view || !levelCode) return;
    const e: Record<string, string> = {};
    const d = date.trim();
    if (!isIsoDate(d)) e.date = t.service.badDate;
    else if (d > todayLocal()) e.date = t.service.futureDate;
    else if (d < view.tractor.registrationDate) e.date = t.service.dateBeforeRegistration;
    const dur = parseDecimal(duration);
    if (dur === null || dur < 0) e.duration = t.service.badNumber;
    const used = parseUsedParts(parts);
    if (!used) e.parts = t.service.badParts;
    setErrors(e);
    if (Object.keys(e).length > 0 || dur === null || !used) return;

    setSaving(true);
    try {
      await recordService({
        tractorId: view.tractor.id,
        levelCode,
        date: date.trim(),
        durationHours: dur,
        usedParts: used,
        note: note.trim() || null,
        photoUris: photos,
        userId: user.id,
      });
      goBack(router);
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
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
            <TractorPicker views={views} selectedId={tractorId} onSelect={(id) => {
                if (id === tractorId) return;
                // Traktor almashganda daraja qayta tanlanadi: yangi traktorning tavsiya etilgani oldindan tanlanadi.
                setTractorId(id);
                setLevelCode(null);
                setPicked(false);
              }}
            />
          </View>

          {view ? (
            <>
              <View style={styles.group}>
                <Text style={styles.label}>{t.service.level}</Text>
                {levels.length === 0 ? <Text style={styles.empty}>{t.service.noLevels}</Text> : null}
                <View style={styles.chips}>
                  {levels.map((l) => {
                    const on = l.code === levelCode;
                    return (
                      <TouchableOpacity
                        key={l.code}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => chooseLevel(l.code, levels)}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {l.name}
                          {l.code === view.recommended ? ` (${t.service.recommended})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.service.date}</Text>
                <TextInput
                  style={[styles.input, errors.date ? styles.inputError : null]}
                  value={date}
                  onChangeText={setDate}
                />
                {errors.date ? <Text style={styles.error}>{errors.date}</Text> : null}
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.service.duration}</Text>
                <TextInput
                  style={[styles.input, errors.duration ? styles.inputError : null]}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="decimal-pad"
                />
                {errors.duration ? <Text style={styles.error}>{errors.duration}</Text> : null}
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.service.parts}</Text>
                {parts.map((p, i) => (
                  <View key={i} style={styles.partRow}>
                    <TextInput
                      style={[styles.input, styles.partName]}
                      value={p.name}
                      onChangeText={(v) => setPart(i, { name: v })}
                      placeholder={t.service.partName}
                    />
                    <TextInput
                      style={[styles.input, styles.partQty]}
                      value={p.quantity}
                      onChangeText={(v) => setPart(i, { quantity: v })}
                      keyboardType="decimal-pad"
                      placeholder={t.service.quantity}
                    />
                    <TouchableOpacity onPress={() => setParts((ps) => ps.filter((_, j) => j !== i))}>
                      <Text style={styles.link}>{t.service.removePart}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {errors.parts ? <Text style={styles.error}>{errors.parts}</Text> : null}
                <TouchableOpacity onPress={() => setParts((ps) => [...ps, { name: '', quantity: '1' }])}>
                  <Text style={styles.link}>+ {t.service.addPart}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.service.note}</Text>
                <TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} multiline />
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t.service.photos}</Text>
                <View style={styles.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={uri + i}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>
                        <Text style={styles.link}>{t.service.removePhoto}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={() => pick(false)}>
                    <Text style={styles.photoButtonText}>{t.service.pickPhoto}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={() => pick(true)}>
                    <Text style={styles.photoButtonText}>{t.service.takePhoto}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submit, (saving || !levelCode) && styles.submitDisabled]}
                onPress={submit}
                disabled={saving || !levelCode}
              >
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>{t.service.save}</Text>}
              </TouchableOpacity>
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
      <Text style={styles.title}>{t.service.title}</Text>
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
  empty: { color: '#6b7280', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextOn: { color: '#ffffff' },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  partName: { flex: 3 },
  partQty: { flex: 1 },
  link: { color: '#2563eb', fontSize: 14, paddingVertical: 6 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photo: { width: 96, height: 96, borderRadius: 8, backgroundColor: '#e5e7eb' },
  photoButtons: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, backgroundColor: '#374151', padding: 12, borderRadius: 8, alignItems: 'center' },
  photoButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  submit: { backgroundColor: '#1f2937', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
