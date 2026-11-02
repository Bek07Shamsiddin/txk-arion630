import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db, type StoredRegulationLevel } from '@/lib/db';
import type { CoreSettings, OperationType } from '@/lib/core/types';
import { todayLocal } from '@/lib/core/dates';
import { refreshAlerts } from '@/lib/services/alerts';
import { recomputeEquivalentHours } from '@/lib/services/motoReadings';
import {
  buildLevelEdit,
  buildOpTypeEdit,
  buildSettings,
  levelToForm,
  newOpTypeError,
  opTypeDeleteGuard,
  opTypeToForm,
  previewK,
  settingsToForm,
  type LevelForm,
  type OpTypeForm,
  type SettingsForm,
} from '@/lib/regulationForm';
import { confirmAction, showMessage } from '@/lib/notify';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { t } from '@/lib/i18n/uz';

type Errs = Record<string, string>;
const EMPTY_NEW = { id: '', name: '', fuelLph: '', source: '', verified: false };

function Field({
  label,
  value,
  onChangeText,
  error,
  numeric = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  numeric?: boolean;
}) {
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, error ? s.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export default function RegulationAdminScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [levels, setLevels] = useState<StoredRegulationLevel[]>([]);
  const [ops, setOps] = useState<OperationType[]>([]);
  const [settings, setSettings] = useState<CoreSettings | null>(null);
  const [levelForms, setLevelForms] = useState<Record<string, LevelForm>>({});
  const [opForms, setOpForms] = useState<Record<string, OpTypeForm>>({});
  const [settingsForm, setSettingsForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<Record<string, Errs>>({});
  const [newOp, setNewOp] = useState(EMPTY_NEW);

  const load = useCallback(async () => {
    try {
      const [ls, os, st] = await Promise.all([db.regulation.list(), db.operationTypes.list(), db.settings.get()]);
      const sorted = [...ls].sort((a, b) => a.intervalHours - b.intervalHours);
      setLevels(sorted);
      setOps(os);
      setSettings(st);
      setLevelForms(Object.fromEntries(sorted.map((l) => [l.id, levelToForm(l)])));
      setOpForms(Object.fromEntries(os.map((o) => [o.id, opTypeToForm(o)])));
      setSettingsForm(settingsToForm(st));
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

  if (!Permissions.isAdmin(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.regAdmin.title} onBack={() => router.back()} />
        <Text style={s.forbidden}>{t.regAdmin.forbidden}</Text>
      </View>
    );
  }
  if (loading || !settings || !settingsForm) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.regAdmin.title} onBack={() => router.back()} />
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  const setErr = (scope: string, e: Errs) => setErrors((prev) => ({ ...prev, [scope]: e }));

  /** Yozishdan keyin barcha traktorlar uchun eslatmalarni yangilaydi. */
  const refreshAll = async () => {
    const today = todayLocal();
    for (const tr of await db.tractors.list()) await refreshAlerts(tr.id, today);
  };

  /** Ish turlari yoki sozlamalar o'zgarsa, mavjud yozuvlarning keltirilgan soati qayta hisoblanadi. */
  const guarded = async (scope: string, work: () => Promise<boolean>, recompute = false) => {
    if (saving) return;
    setSaving(true);
    try {
      if (await work()) {
        const n = recompute ? await recomputeEquivalentHours() : null;
        await refreshAll();
        await load();
        showMessage(t.regAdmin.saved, n === null ? '' : `${n} ${t.regAdmin.recomputed}`);
      } else {
        showMessage(t.common.error, t.regAdmin.fixErrors);
      }
    } catch (e) {
      showMessage(t.regAdmin.saveFailed, (e as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
    }
  };

  const saveLevel = (l: StoredRegulationLevel) =>
    guarded(`level.${l.id}`, async () => {
      const r = buildLevelEdit(levelForms[l.id], l);
      setErr(`level.${l.id}`, r.errors);
      if (!r.value) return false;
      await db.regulation.update(l.id, {
        intervalHours: r.value.intervalHours,
        durationHours: r.value.durationHours,
        parts: r.value.parts,
      });
      return true;
    });

  const saveOp = (o: OperationType) =>
    guarded(`op.${o.id}`, async () => {
      const r = buildOpTypeEdit(opForms[o.id], o);
      setErr(`op.${o.id}`, r.errors);
      if (!r.value) return false;
      await db.operationTypes.update(o.id, r.value);
      return true;
    }, true);

  const addOp = () =>
    guarded('newOp', async () => {
      const e: Errs = {};
      const id = newOp.id.trim();
      const idErr = newOpTypeError(id, ops);
      if (idErr) e.id = idErr;
      const r = buildOpTypeEdit(newOp, { id, name: '', fuelLph: 0, source: '', verified: false });
      Object.assign(e, r.errors);
      setErr('newOp', e);
      if (Object.keys(e).length > 0 || !r.value) return false;
      await db.operationTypes.replaceAll([...ops, r.value]);
      setNewOp(EMPTY_NEW);
      return true;
    }, true);

  const removeOp = async (o: OperationType) => {
    if (saving) return;
    try {
      const guard = opTypeDeleteGuard(o.id, await db.motoReadings.list());
      if (!guard.ok) {
        showMessage(t.common.error, `${t.regAdmin.deleteBlocked} (${guard.count})`);
        return;
      }
      if (!(await confirmAction(t.regAdmin.deleteOp, t.regAdmin.deleteOpConfirm))) return;
      await db.operationTypes.remove(o.id);
      await recomputeEquivalentHours();
      await refreshAll();
      await load();
    } catch (e) {
      showMessage(t.regAdmin.saveFailed, (e as Error).message || t.errors.storage);
    }
  };

  const saveSettings = () =>
    guarded('settings', async () => {
      const r = buildSettings(settingsForm, settings);
      setErr('settings', r.errors);
      if (!r.value) return false;
      await db.settings.set(r.value);
      return true;
    }, true);

  const patchLevel = (id: string, f: (x: LevelForm) => LevelForm) =>
    setLevelForms((prev) => ({ ...prev, [id]: f(prev[id]) }));
  const patchOp = (id: string, patch: Partial<OpTypeForm>) =>
    setOpForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // Jonli K uchun: forma yaroqli bo'lsa undagi qiymatlar, aks holda saqlangan sozlamalar.
  const liveSettings = buildSettings(settingsForm, settings).value ?? settings;
  const SaveButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={[s.submit, saving && s.submitDisabled]} onPress={onPress} disabled={saving}>
      <Text style={s.submitText}>{t.common.save}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <ScreenHeader title={t.regAdmin.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>{t.regAdmin.levels}</Text>
        {levels.map((l) => {
          const f = levelForms[l.id];
          const e = errors[`level.${l.id}`] ?? {};
          if (!f) return null;
          return (
            <View key={l.id} style={s.card}>
              <Text style={s.cardTitle}>{l.name}</Text>
              <Text style={s.cardMeta}>{l.code}</Text>
              <Field
                label={t.regAdmin.interval}
                value={f.intervalHours}
                error={e.intervalHours}
                onChangeText={(v) => patchLevel(l.id, (x) => ({ ...x, intervalHours: v }))}
              />
              <Field
                label={t.regAdmin.duration}
                value={f.durationHours}
                error={e.durationHours}
                onChangeText={(v) => patchLevel(l.id, (x) => ({ ...x, durationHours: v }))}
              />
              <Text style={s.label}>{t.regAdmin.parts}</Text>
              {f.parts.map((p, i) => (
                <View key={i} style={styles.partBlock}>
                  <View style={s.partRow}>
                    <TextInput
                      style={[s.input, s.partName, e[`parts.${i}.name`] ? s.inputError : null]}
                      placeholder={t.regAdmin.partName}
                      value={p.name}
                      onChangeText={(v) =>
                        patchLevel(l.id, (x) => ({ ...x, parts: x.parts.map((q, j) => (j === i ? { ...q, name: v } : q)) }))
                      }
                    />
                    <TextInput
                      style={[s.input, s.partQty, e[`parts.${i}.quantity`] ? s.inputError : null]}
                      placeholder={t.regAdmin.partQty}
                      value={p.quantity}
                      keyboardType="decimal-pad"
                      onChangeText={(v) =>
                        patchLevel(l.id, (x) => ({ ...x, parts: x.parts.map((q, j) => (j === i ? { ...q, quantity: v } : q)) }))
                      }
                    />
                    <TextInput
                      style={[s.input, s.partQty, e[`parts.${i}.leadDays`] ? s.inputError : null]}
                      placeholder={t.regAdmin.partLead}
                      value={p.leadDays}
                      keyboardType="decimal-pad"
                      onChangeText={(v) =>
                        patchLevel(l.id, (x) => ({ ...x, parts: x.parts.map((q, j) => (j === i ? { ...q, leadDays: v } : q)) }))
                      }
                    />
                  </View>
                  {e[`parts.${i}.name`] ? <Text style={s.error}>{e[`parts.${i}.name`]}</Text> : null}
                  {e[`parts.${i}.quantity`] ? <Text style={s.error}>{e[`parts.${i}.quantity`]}</Text> : null}
                  {e[`parts.${i}.leadDays`] ? <Text style={s.error}>{e[`parts.${i}.leadDays`]}</Text> : null}
                  <TouchableOpacity
                    onPress={() => patchLevel(l.id, (x) => ({ ...x, parts: x.parts.filter((_, j) => j !== i) }))}
                  >
                    <Text style={styles.removeText}>{t.regAdmin.removePart}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={s.cardMeta}>
                {t.regAdmin.partName} · {t.regAdmin.partQty} · {t.regAdmin.partLead}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  patchLevel(l.id, (x) => ({ ...x, parts: [...x.parts, { name: '', quantity: '1', leadDays: '7' }] }))
                }
              >
                <Text style={s.link}>{t.regAdmin.addPart}</Text>
              </TouchableOpacity>
              <SaveButton onPress={() => saveLevel(l)} />
            </View>
          );
        })}

        <Text style={styles.section}>{t.regAdmin.ops}</Text>
        {ops.map((o) => {
          const f = opForms[o.id];
          const e = errors[`op.${o.id}`] ?? {};
          if (!f) return null;
          const k = previewK(f.fuelLph, liveSettings);
          return (
            <View key={o.id} style={s.card}>
              <Text style={s.cardMeta}>{o.id}</Text>
              <Field label={t.regAdmin.opName} value={f.name} error={e.name} numeric={false} onChangeText={(v) => patchOp(o.id, { name: v })} />
              <Field label={t.regAdmin.fuelLph} value={f.fuelLph} error={e.fuelLph} onChangeText={(v) => patchOp(o.id, { fuelLph: v })} />
              <Text style={styles.kText}>
                {t.regAdmin.kValue} = {k === null ? '—' : k.toFixed(2)}
              </Text>
              <Field label={t.regAdmin.source} value={f.source} numeric={false} onChangeText={(v) => patchOp(o.id, { source: v })} />
              <View style={styles.switchRow}>
                <Text style={s.label}>{t.regAdmin.verified}</Text>
                <Switch value={f.verified} onValueChange={(v) => patchOp(o.id, { verified: v })} />
              </View>
              <SaveButton onPress={() => saveOp(o)} />
              <TouchableOpacity style={[s.action, s.actionDanger, styles.deleteBtn]} onPress={() => removeOp(o)}>
                <Text style={s.actionText}>{t.regAdmin.deleteOp}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={s.card}>
          <Text style={s.cardTitle}>{t.regAdmin.addOp}</Text>
          {(() => {
            const e = errors.newOp ?? {};
            const k = previewK(newOp.fuelLph, liveSettings);
            return (
              <>
                <Field label={t.regAdmin.opId} value={newOp.id} error={e.id} numeric={false} onChangeText={(v) => setNewOp({ ...newOp, id: v })} />
                <Field label={t.regAdmin.opName} value={newOp.name} error={e.name} numeric={false} onChangeText={(v) => setNewOp({ ...newOp, name: v })} />
                <Field label={t.regAdmin.fuelLph} value={newOp.fuelLph} error={e.fuelLph} onChangeText={(v) => setNewOp({ ...newOp, fuelLph: v })} />
                <Text style={styles.kText}>
                  {t.regAdmin.kValue} = {k === null ? '—' : k.toFixed(2)}
                </Text>
                <Field label={t.regAdmin.source} value={newOp.source} numeric={false} onChangeText={(v) => setNewOp({ ...newOp, source: v })} />
                <View style={styles.switchRow}>
                  <Text style={s.label}>{t.regAdmin.verified}</Text>
                  <Switch value={newOp.verified} onValueChange={(v) => setNewOp({ ...newOp, verified: v })} />
                </View>
              </>
            );
          })()}
          <TouchableOpacity style={[s.submit, saving && s.submitDisabled]} onPress={addOp} disabled={saving}>
            <Text style={s.submitText}>{t.common.add}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>{t.regAdmin.settings}</Text>
        <View style={s.card}>
          {(() => {
            const e = errors.settings ?? {};
            const set = (patch: Partial<SettingsForm>) => setSettingsForm({ ...settingsForm, ...patch });
            return (
              <>
                <Field label={t.regAdmin.nominalFuelLph} value={settingsForm.nominalFuelLph} error={e.nominalFuelLph} onChangeText={(v) => set({ nominalFuelLph: v })} />
                <Field label={t.regAdmin.gamma} value={settingsForm.gamma} error={e.gamma} onChangeText={(v) => set({ gamma: v })} />
                <Field label={t.regAdmin.reorderBufferDays} value={settingsForm.reorderBufferDays} error={e.reorderBufferDays} onChangeText={(v) => set({ reorderBufferDays: v })} />
                <Field label={t.regAdmin.shiftHoursPerDay} value={settingsForm.shiftHoursPerDay} error={e.shiftHoursPerDay} onChangeText={(v) => set({ shiftHoursPerDay: v })} />
              </>
            );
          })()}
          <SaveButton onPress={saveSettings} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 12 },
  partBlock: { marginBottom: 8 },
  removeText: { color: '#dc2626', fontSize: 13, paddingVertical: 2 },
  kText: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-start' },
});
