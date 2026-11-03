import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { PartsRequest, Tractor, User } from '@/lib/db/schema';
import { allowedPartsStatuses, setPartsStatus } from '@/lib/services/requests';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { confirmAction, showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

export default function PartsAdminScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<PartsRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [rs, us, ts] = await Promise.all([db.partsRequests.list(), db.users.list(), db.tractors.list()]);
      setItems([...rs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      setUsers(us);
      setTractors(ts);
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

  if (!Permissions.canManageParts(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.parts.adminTitle} onBack={() => goBack(router)} />
        <Text style={s.forbidden}>{t.parts.forbiddenAdmin}</Text>
      </View>
    );
  }

  const change = async (r: PartsRequest, next: PartsRequest['status']) => {
    if (next === 'cancelled' && !(await confirmAction(t.parts.statuses.cancelled, t.parts.cancelConfirm))) return;
    try {
      await setPartsStatus(r.id, next);
      await load();
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    }
  };

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? t.parts.unknownUser;
  const tractorOf = (id: string) => {
    const x = tractors.find((tr) => tr.id === id);
    return x ? `${x.model} · ${x.serialNumber}` : '';
  };

  return (
    <View style={s.container}>
      <ScreenHeader
        title={t.parts.adminTitle}
        onBack={() => goBack(router)}
        right={{ label: t.parts.history, onPress: () => router.push('/parts-history' as never) }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          contentContainerStyle={s.scroll}
          data={items}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={<Text style={s.empty}>{t.parts.empty}</Text>}
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <Text style={s.cardTitle}>
                {r.partName} × {r.quantity}
              </Text>
              <Text style={s.cardMeta}>{tractorOf(r.tractorId)}</Text>
              <Text style={s.cardMeta}>
                {t.parts.requester}: {nameOf(r.requestedBy)} · {r.requestDate}
              </Text>
              <Text style={s.cardMeta}>
                {t.parts.urgency}: {t.parts.urgencies[r.urgency]}
              </Text>
              {r.notes ? <Text style={s.cardMeta}>{r.notes}</Text> : null}
              {r.deliveredAt ? (
                <Text style={s.cardMeta}>
                  {t.parts.deliveredOn}: {r.deliveredAt.slice(0, 10)}
                </Text>
              ) : null}
              <View style={s.badge}>
                <Text style={s.badgeText}>{t.parts.statuses[r.status]}</Text>
              </View>
              <View style={s.actionRow}>
                {allowedPartsStatuses(r.status).map((next) => (
                  <TouchableOpacity
                    key={next}
                    style={[s.action, next === 'cancelled' && s.actionDanger]}
                    onPress={() => change(r, next)}
                  >
                    <Text style={s.actionText}>{t.parts.statuses[next]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
