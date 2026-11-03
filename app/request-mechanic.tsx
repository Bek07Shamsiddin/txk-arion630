import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { todayLocal } from '@/lib/core/dates';
import { listTractorViews, type TractorView } from '@/lib/services/tractors';
import { createMechanicRequest } from '@/lib/services/requests';
import { TractorPicker } from '@/components/TractorPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

export default function RequestMechanicScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string }>();
  const [views, setViews] = useState<TractorView[]>([]);
  const [tractorId, setTractorId] = useState<string | null>(params.tractorId ? String(params.tractorId) : null);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const vs = await listTractorViews(todayLocal());
          if (alive) setViews(vs);
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

  if (!Permissions.canRequestMechanic(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.mechanic.title} onBack={() => goBack(router)} />
        <Text style={s.forbidden}>{t.mechanic.forbidden}</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!user || !tractorId) return;
    if (!problem.trim()) {
      setError(t.mechanic.required);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createMechanicRequest({ tractorId, problem, userId: user.id });
      showMessage(t.mechanic.title, t.mechanic.sent);
      goBack(router);
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <ScreenHeader
        title={t.mechanic.title}
        onBack={() => goBack(router)}
        right={{ label: t.mechanic.myRequests, onPress: () => router.push('/mechanic-requests' as never) }}
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
                <Text style={s.label}>{t.mechanic.problem}</Text>
                <TextInput
                  style={[s.input, s.multiline, error ? s.inputError : null]}
                  value={problem}
                  onChangeText={setProblem}
                  multiline
                />
                {error ? <Text style={s.error}>{error}</Text> : null}
              </View>
              <TouchableOpacity style={[s.submit, saving && s.submitDisabled]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitText}>{t.mechanic.send}</Text>}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
