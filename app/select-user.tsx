import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '@/lib/db';
import type { User } from '@/lib/db/schema';
import { useSession } from '@/lib/session';
import { getRoleColor } from '@/lib/permissions';
import { t } from '@/lib/i18n/uz';

export default function SelectUserScreen() {
  const { signIn } = useSession();
  const [users, setUsers] = useState<User[] | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    db.users
      .list()
      .then((all) => setUsers(all.filter((u) => u.active)))
      .catch((e) => setError((e as Error).message));
  }, []);

  const submit = async (u: User, p: string | null) => {
    try {
      const ok = await signIn(u.id, p);
      if (!ok) {
        setError(t.session.wrongPin);
        setPin('');
      }
    } catch {
      setError(t.errors.generic);
      setPin('');
    }
    // Muvaffaqiyatda root layout /(tabs) ga yo'naltiradi.
  };

  const choose = (u: User) => {
    setError('');
    setPin('');
    if (u.pinHash === null) {
      void submit(u, null);
    } else {
      setSelected(u);
    }
  };

  if (!users) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color="#3b82f6" />}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.session.selectUserTitle}</Text>
      <Text style={styles.subtitle}>{t.session.selectUserHint}</Text>

      {users.length === 0 && <Text style={styles.subtitle}>{t.session.noUsers}</Text>}

      {users.map((u) => (
        <TouchableOpacity
          key={u.id}
          style={[styles.card, selected?.id === u.id && styles.cardSelected]}
          onPress={() => choose(u)}
        >
          <View style={[styles.dot, { backgroundColor: getRoleColor(u.role) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{u.name}</Text>
            <Text style={styles.role}>{u.title ? `${u.title} · ` : ''}{t.roles[u.role]}{u.phone ? ` · ${u.phone}` : ''}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {selected && (
        <View style={styles.pinBox}>
          <Text style={styles.label}>
            {selected.name}: {t.session.enterPin}
          </Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder={t.session.pinPlaceholder}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoFocus
          />
          <TouchableOpacity style={styles.button} onPress={() => submit(selected, pin)}>
            <Text style={styles.buttonText}>{t.session.signIn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSelected: { borderColor: '#3b82f6' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  role: { fontSize: 13, color: '#64748b', marginTop: 2 },
  pinBox: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 14, color: '#334155', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    letterSpacing: 6,
    marginBottom: 12,
  },
  button: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#b91c1c', marginTop: 12, fontSize: 14 },
});
