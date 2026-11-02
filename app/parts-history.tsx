import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { PartsRequest, Tractor, User } from '@/lib/db/schema';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';

export default function PartsHistoryScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<PartsRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [rs, us, ts] = await Promise.all([db.partsRequests.list(), db.users.list(), db.tractors.list()]);
          if (!alive) return;
          setItems([...rs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
          setUsers(us);
          setTractors(ts);
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

  if (!Permissions.canRequestParts(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.parts.historyTitle} onBack={() => router.back()} />
        <Text style={s.forbidden}>{t.parts.forbidden}</Text>
      </View>
    );
  }

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? t.parts.unknownUser;
  const tractorOf = (id: string) => {
    const x = tractors.find((tr) => tr.id === id);
    return x ? `${x.model} · ${x.serialNumber}` : '';
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={t.parts.historyTitle} onBack={() => router.back()} />
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
                {t.parts.requester}: {nameOf(r.requestedBy)}
              </Text>
              <Text style={s.cardMeta}>
                {t.parts.requestedOn}: {r.requestDate}
              </Text>
              {r.deliveredAt ? (
                <Text style={s.cardMeta}>
                  {t.parts.deliveredOn}: {r.deliveredAt.slice(0, 10)}
                </Text>
              ) : null}
              <Text style={s.cardMeta}>
                {t.parts.urgency}: {t.parts.urgencies[r.urgency]}
              </Text>
              {r.notes ? <Text style={s.cardMeta}>{r.notes}</Text> : null}
              <View style={s.badge}>
                <Text style={s.badgeText}>{t.parts.statuses[r.status]}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
