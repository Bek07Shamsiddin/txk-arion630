import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { db } from '@/lib/db';
import type { AppNotification } from '@/lib/db/schema';
import { notificationColor, notificationHref, sortNewestFirst, unreadCount } from '@/lib/notificationView';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(sortNewestFirst(await db.notifications.list()));
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

  const open = async (n: AppNotification) => {
    try {
      if (!n.isRead) {
        await db.notifications.update(n.id, { isRead: true });
        setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      }
      const href = notificationHref(n);
      if (href) router.push(href as never);
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    }
  };

  const markAll = async () => {
    try {
      await Promise.all(items.filter((n) => !n.isRead).map((n) => db.notifications.update(n.id, { isRead: true })));
      await load();
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.storage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack(router)} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.notifications.title}</Text>
        <View style={styles.placeholder} />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            unreadCount(items) > 0 ? (
              <TouchableOpacity style={styles.markAll} onPress={markAll}>
                <Text style={styles.markAllText}>{t.notifications.markAll}</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>{t.notifications.empty}</Text>}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: notificationColor(n.kind) }, n.isRead && styles.cardRead]}
              onPress={() => open(n)}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.kind, { color: notificationColor(n.kind) }]}>{t.notifications.kinds[n.kind]}</Text>
                {!n.isRead ? <Text style={styles.badge}>{t.notifications.unread}</Text> : null}
              </View>
              <Text style={[styles.message, !n.isRead && styles.messageUnread]}>{n.message}</Text>
              <Text style={styles.date}>{n.createdAt.slice(0, 10)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  list: { padding: 16, gap: 10 },
  empty: { padding: 24, fontSize: 15, color: '#6b7280', textAlign: 'center' },
  markAll: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 4 },
  markAllText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 5,
    gap: 4,
  },
  cardRead: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  kind: { fontSize: 12, fontWeight: '700' },
  badge: { fontSize: 11, color: '#ffffff', backgroundColor: '#ef4444', paddingHorizontal: 6, borderRadius: 8, overflow: 'hidden' },
  message: { fontSize: 14, color: '#374151' },
  messageUnread: { fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#9ca3af' },
});
