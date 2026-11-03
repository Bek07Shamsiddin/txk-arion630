import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { PartsRequest } from '@/lib/db/schema';
import { todayLocal } from '@/lib/core/dates';
import { listTractorViews, type TractorView } from '@/lib/services/tractors';
import { createPartsRequests } from '@/lib/services/requests';
import { parseUsedParts, prefillParts, type PartRow } from '@/lib/serviceForm';
import { TractorPicker } from '@/components/TractorPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

const URGENCIES: PartsRequest['urgency'][] = ['urgent', 'medium', 'normal'];

export default function RequestPartsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string; levelCode?: string }>();
  const levelCode = params.levelCode ? String(params.levelCode) : null;
  const [views, setViews] = useState<TractorView[]>([]);
  const [tractorId, setTractorId] = useState<string | null>(params.tractorId ? String(params.tractorId) : null);
  const [parts, setParts] = useState<PartRow[]>([{ name: '', quantity: '1' }]);
  const [urgency, setUrgency] = useState<PartsRequest['urgency']>('normal');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [vs, lvs] = await Promise.all([listTractorViews(todayLocal()), db.regulation.list()]);
          if (!alive) return;
          setViews(vs);
          if (levelCode && !prefilled) {
            const rows = prefillParts(lvs.find((l) => l.code === levelCode));
            if (rows.length > 0) setParts(rows);
            setPrefilled(true);
          }
        } catch (e) {
          showMessage(t.common.error, (e as Error).message || t.errors.storage);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [levelCode, prefilled]),
  );

  useEffect(() => {
    if (!tractorId && views.length === 1) setTractorId(views[0].tractor.id);
  }, [views, tractorId]);

  if (!Permissions.canRequestParts(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.parts.title} onBack={() => goBack(router)} />
        <Text style={s.forbidden}>{t.parts.forbidden}</Text>
      </View>
    );
  }

  const setPart = (i: number, patch: Partial<PartRow>) =>
    setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async () => {
    if (!user || !tractorId) return;
    const used = parseUsedParts(parts);
    if (!used || used.length === 0) {
      setError(t.parts.badParts);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createPartsRequests({
        tractorId,
        requestedBy: user.id,
        urgency,
        notes: note.trim() || null,
        levelCode,
        parts: used,
      });
      showMessage(t.parts.title, t.parts.sent);
      goBack(router);
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
    }
  };

  const manage = Permissions.canManageParts(user);

  return (
    <View style={s.container}>
      <ScreenHeader
        title={t.parts.title}
        onBack={() => goBack(router)}
        right={{
          label: manage ? t.parts.manage : t.parts.history,
          onPress: () => router.push((manage ? '/parts-admin' : '/parts-history') as never),
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.group}>
            <Text style={s.label}>{t.hours.tractor}</Text>
            <TractorPicker views={views} selectedId={tractorId} onSelect={setTractorId} />
          </View>

          {tractorId ? (
            <>
              <View style={s.group}>
                <Text style={s.label}>{t.service.parts}</Text>
                {parts.map((p, i) => (
                  <View key={i} style={s.partRow}>
                    <TextInput
                      style={[s.input, s.partName]}
                      value={p.name}
                      onChangeText={(v) => setPart(i, { name: v })}
                      placeholder={t.parts.partName}
                    />
                    <TextInput
                      style={[s.input, s.partQty]}
                      value={p.quantity}
                      onChangeText={(v) => setPart(i, { quantity: v })}
                      keyboardType="decimal-pad"
                      placeholder={t.parts.quantity}
                    />
                    <TouchableOpacity onPress={() => setParts((ps) => ps.filter((_, j) => j !== i))}>
                      <Text style={s.link}>{t.parts.removePart}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {error ? <Text style={s.error}>{error}</Text> : null}
                <TouchableOpacity onPress={() => setParts((ps) => [...ps, { name: '', quantity: '1' }])}>
                  <Text style={s.link}>+ {t.parts.addPart}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.group}>
                <Text style={s.label}>{t.parts.urgency}</Text>
                <View style={s.chips}>
                  {URGENCIES.map((u) => (
                    <TouchableOpacity key={u} style={[s.chip, urgency === u && s.chipOn]} onPress={() => setUrgency(u)}>
                      <Text style={[s.chipText, urgency === u && s.chipTextOn]}>{t.parts.urgencies[u]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={s.group}>
                <Text style={s.label}>{t.parts.note}</Text>
                <TextInput style={[s.input, s.multiline]} value={note} onChangeText={setNote} multiline />
              </View>

              <TouchableOpacity style={[s.submit, saving && s.submitDisabled]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitText}>{t.parts.send}</Text>}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
