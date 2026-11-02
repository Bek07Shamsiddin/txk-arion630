import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { db } from '@/lib/db';
import type { User } from '@/lib/db/schema';
import { useSession } from '@/lib/session';
import { hashPin } from '@/lib/sessionStore';
import { Permissions } from '@/lib/permissions';
import { t } from '@/lib/i18n/uz';

type Role = User['role'];
const ROLES: Role[] = ['operator', 'technician', 'admin'];
const validPin = (p: string) => /^\d{4}$/.test(p);

function RolePicker({ value, onPick }: { value: Role; onPick: (r: Role) => void }) {
  return (
    <View style={styles.row}>
      {ROLES.map((r) => (
        <TouchableOpacity key={r} style={[styles.chip, value === r && styles.chipOn]} onPress={() => onPick(r)}>
          <Text style={[styles.chipText, value === r && styles.chipTextOn]}>{t.roles[r]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function UsersAdminScreen() {
  const router = useRouter();
  const { user: me, refresh } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('operator');
  const [pin, setPin] = useState('');
  const [pinEdits, setPinEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setUsers(await db.users.list());
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!Permissions.canManageUsers(me)) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{t.users.adminOnly}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>{t.common.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeAdmins = users.filter((u) => u.role === 'admin' && u.active);
  const isLastAdmin = (u: User) => u.role === 'admin' && u.active && activeAdmins.length <= 1;

  const apply = async (id: string, patch: Partial<User>) => {
    setMessage('');
    try {
      await db.users.update(id, patch);
      await load();
      if (id === me?.id) await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const addUser = async () => {
    if (!name.trim()) return setMessage(t.users.nameRequired);
    if (pin !== '' && !validPin(pin)) return setMessage(t.users.pinInvalid);
    setMessage('');
    try {
      await db.users.insert({
        name: name.trim(),
        role,
        pinHash: pin === '' ? null : hashPin(pin),
        active: true,
        createdAt: new Date().toISOString(),
      });
      setName('');
      setPin('');
      setRole('operator');
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const changeRole = (u: User, r: Role) => {
    if (r === u.role) return;
    if (isLastAdmin(u)) return setMessage(t.users.lastAdmin);
    void apply(u.id, { role: r });
  };

  const toggleActive = (u: User) => {
    if (u.active && isLastAdmin(u)) return setMessage(t.users.lastAdmin);
    void apply(u.id, { active: !u.active });
  };

  const setUserPin = (u: User) => {
    const p = pinEdits[u.id] ?? '';
    if (!validPin(p)) return setMessage(t.users.pinInvalid);
    setPinEdits({ ...pinEdits, [u.id]: '' });
    void apply(u.id, { pinHash: hashPin(p) });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.users.title}</Text>
      </View>

      {message !== '' && <Text style={styles.error}>{message}</Text>}

      <View style={styles.card}>
        <Text style={styles.section}>{t.users.add}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t.users.namePlaceholder} />
        <RolePicker value={role} onPick={setRole} />
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          placeholder={t.users.pinOptional}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TouchableOpacity style={styles.button} onPress={addUser}>
          <Text style={styles.buttonText}>{t.common.add}</Text>
        </TouchableOpacity>
      </View>

      {users.map((u) => (
        <View key={u.id} style={[styles.card, !u.active && styles.inactive]}>
          <Text style={styles.name}>
            {u.name}
            {!u.active ? `  (${t.users.inactive})` : ''}
          </Text>
          <Text style={styles.muted}>{u.pinHash ? t.users.hasPin : t.users.noPin}</Text>
          <RolePicker value={u.role} onPick={(r) => changeRole(u, r)} />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={pinEdits[u.id] ?? ''}
              onChangeText={(v) => setPinEdits({ ...pinEdits, [u.id]: v.replace(/\D/g, '').slice(0, 4) })}
              placeholder={t.session.pinPlaceholder}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            <TouchableOpacity style={styles.smallButton} onPress={() => setUserPin(u)}>
              <Text style={styles.buttonText}>{t.users.setPin}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            {u.pinHash !== null && (
              <TouchableOpacity style={styles.outline} onPress={() => apply(u.id, { pinHash: null })}>
                <Text style={styles.outlineText}>{t.users.clearPin}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.outline} onPress={() => toggleActive(u)}>
              <Text style={styles.outlineText}>{u.active ? t.users.deactivate : t.users.activate}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingTop: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  inactive: { opacity: 0.6 },
  section: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#0f172a' },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  muted: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 10 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1' },
  chipOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextOn: { color: '#fff' },
  button: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 12, alignItems: 'center' },
  smallButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  outline: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  outlineText: { color: '#334155', fontSize: 13 },
  error: { color: '#b91c1c', marginBottom: 12, fontSize: 14 },
  link: { color: '#3b82f6', marginTop: 12, fontSize: 15 },
});
