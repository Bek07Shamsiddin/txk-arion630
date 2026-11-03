import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import type { MechanicRequest, Tractor, User } from '@/lib/db/schema';
import { acceptMechanicRequest, completeMechanicRequest } from '@/lib/services/requests';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

const fmt = (iso: string) => iso.slice(0, 16).replace('T', ' ');

export default function MechanicRequestsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<MechanicRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const [rs, us, ts] = await Promise.all([db.mechanicRequests.list(), db.users.list(), db.tractors.list()]);
      setItems([...rs].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1)));
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

  const manage = Permissions.canManageMechanicRequests(user);
  // Operator faqat o'z so'rovlarini ko'radi.
  const canSee = manage || Permissions.canRequestMechanic(user);
  if (!canSee) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.mechanic.listTitle} onBack={() => goBack(router)} />
        <Text style={s.forbidden}>{t.mechanic.forbiddenList}</Text>
      </View>
    );
  }
  const visible = manage ? items : items.filter((r) => r.userId === user?.id);

  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? t.parts.unknownUser : '');
  const tractorOf = (id: string) => {
    const x = tractors.find((tr) => tr.id === id);
    return x ? `${x.model} · ${x.serialNumber}` : '';
  };

  const accept = async (r: MechanicRequest) => {
    if (!user) return;
    try {
      await acceptMechanicRequest(r.id, user.id);
      await load();
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    }
  };

  const complete = async (r: MechanicRequest) => {
    try {
      await completeMechanicRequest(r.id, notes);
      setCompleting(null);
      setNotes('');
      await load();
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={t.mechanic.listTitle} onBack={() => goBack(router)} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          contentContainerStyle={s.scroll}
          data={visible}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={<Text style={s.empty}>{t.mechanic.empty}</Text>}
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <Text style={s.cardTitle}>{r.problem}</Text>
              <Text style={s.cardMeta}>{tractorOf(r.tractorId)}</Text>
              <Text style={s.cardMeta}>
                {t.mechanic.operator}: {nameOf(r.userId)}
              </Text>
              <Text style={s.cardMeta}>
                {t.mechanic.openedAt}: {fmt(r.openedAt)}
              </Text>
              {r.technicianId ? (
                <Text style={s.cardMeta}>
                  {t.mechanic.technician}: {nameOf(r.technicianId)}
                </Text>
              ) : null}
              {r.closedAt ? (
                <Text style={s.cardMeta}>
                  {t.mechanic.closedAt}: {fmt(r.closedAt)}
                </Text>
              ) : null}
              {r.technicianNotes ? <Text style={s.cardMeta}>{r.technicianNotes}</Text> : null}
              <View style={s.badge}>
                <Text style={s.badgeText}>{t.mechanic.statuses[r.status]}</Text>
              </View>

              {manage && r.status === 'pending' ? (
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.action} onPress={() => accept(r)}>
                    <Text style={s.actionText}>{t.mechanic.accept}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {manage && r.status === 'in_progress' ? (
                completing === r.id ? (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      style={[s.input, s.multiline]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={t.mechanic.notes}
                      multiline
                    />
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.action} onPress={() => complete(r)}>
                        <Text style={s.actionText}>{t.mechanic.complete}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.action, s.actionDanger]}
                        onPress={() => {
                          setCompleting(null);
                          setNotes('');
                        }}
                      >
                        <Text style={s.actionText}>{t.common.cancel}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.action} onPress={() => setCompleting(r.id)}>
                      <Text style={s.actionText}>{t.mechanic.complete}</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
