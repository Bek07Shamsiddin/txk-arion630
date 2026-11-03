import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/lib/db';
import type { OperationType } from '@/lib/core/types';
import { DEFAULT_SIM_PARAMS, sensitivity, simulate, type Stat, type StrategySummary } from '@/lib/core/simulator';
import { buildSimParams, paramsToForm, type SimFormState, type SimNumericKey } from '@/lib/simForm';
import { showMessage } from '@/lib/notify';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { ParamForm } from '@/components/sim/ParamForm';
import { ResultTable } from '@/components/sim/ResultTable';
import { SensitivityChart } from '@/components/sim/SensitivityChart';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

type Mode = 'run' | 'sens' | null;

export default function SimulatorScreen() {
  const router = useRouter();
  const [ops, setOps] = useState<OperationType[] | null>(null);
  const [form, setForm] = useState<SimFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Mode>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ s1: StrategySummary; s2: StrategySummary } | null>(null);
  const [sens, setSens] = useState<{ beta: number; costDiff: Stat }[] | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const list = await db.operationTypes.list();
        if (!alive.current) return;
        setOps(list);
        setForm(paramsToForm(DEFAULT_SIM_PARAMS, list));
      } catch (e) {
        showMessage(t.common.error, (e as Error).message || t.errors.storage);
      }
    })();
    return () => {
      alive.current = false;
    };
  }, []);

  if (!ops || !form) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.sim.title} onBack={() => goBack(router)} />
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  const disabled = busy !== null;

  const setField = (k: SimNumericKey, v: string) => setForm({ ...form, [k]: v });
  const setMix = (id: string, v: string) => setForm({ ...form, mix: { ...form.mix, [id]: v } });
  const reset = () => {
    setForm(paramsToForm(DEFAULT_SIM_PARAMS, ops));
    setErrors({});
  };

  const run = async (mode: Exclude<Mode, null>) => {
    if (busy) return;
    const built = buildSimParams(form, ops);
    setErrors(built.errors);
    if (!built.params) return;
    setBusy(mode);
    setProgress(0);
    try {
      // Joriy ish turlari va sozlamalar ishga tushirish paytida o'qiladi.
      const [curOps, settings] = await Promise.all([db.operationTypes.list(), db.settings.get()]);
      if (mode === 'run') {
        const r = await simulate(built.params, curOps, settings, (done) => {
          if (alive.current) setProgress(done / built.params!.runs);
        });
        if (alive.current) setResult(r);
      } else {
        const r = await sensitivity(built.params, curOps, settings);
        if (alive.current) setSens(r);
      }
    } catch (e) {
      showMessage(t.sim.runFailed, (e as Error).message || t.errors.generic);
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={t.sim.title} onBack={() => goBack(router)} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>{t.sim.params}</Text>
        <ParamForm form={form} errors={errors} ops={ops} disabled={disabled} onChange={setField} onMixChange={setMix} />

        <TouchableOpacity style={[styles.secondary, disabled && s.submitDisabled]} onPress={reset} disabled={disabled}>
          <Text style={styles.secondaryText}>{t.sim.reset}</Text>
        </TouchableOpacity>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[s.submit, styles.flex, disabled && s.submitDisabled]}
            onPress={() => run('run')}
            disabled={disabled}
          >
            <Text style={s.submitText}>{busy === 'run' ? t.sim.running : t.sim.run}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submit, styles.flex, styles.sensBtn, disabled && s.submitDisabled]}
            onPress={() => run('sens')}
            disabled={disabled}
          >
            <Text style={s.submitText}>{busy === 'sens' ? t.sim.running : t.sim.sensitivity}</Text>
          </TouchableOpacity>
        </View>

        {busy === 'run' ? (
          <Text style={styles.progress}>
            {t.sim.progress}: {Math.round(progress * 100)}%
          </Text>
        ) : null}
        {busy === 'sens' ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

        {result ? (
          <View style={styles.block}>
            <Text style={styles.section}>{t.sim.result}</Text>
            <ResultTable s1={result.s1} s2={result.s2} />
          </View>
        ) : null}

        {sens ? (
          <View style={styles.block}>
            <SensitivityChart data={sens} />
          </View>
        ) : null}

        <View style={styles.notes}>
          <Text style={styles.note}>{t.sim.noteModel}</Text>
          <Text style={styles.note}>{t.sim.noteScope}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  secondary: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  sensBtn: { backgroundColor: '#2563eb' },
  progress: { marginTop: 12, fontSize: 14, color: '#374151', textAlign: 'center' },
  block: { marginTop: 24 },
  notes: { marginTop: 24, padding: 12, backgroundColor: '#fffbeb', borderRadius: 8 },
  note: { fontSize: 12, color: '#92400e', marginBottom: 4 },
});
