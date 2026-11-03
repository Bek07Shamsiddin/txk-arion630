import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { onLiveTick } from '@/lib/live/fieldWork';
import { useRouter } from 'expo-router';
import { db } from '@/lib/db';
import { todayLocal } from '@/lib/core/dates';
import { refreshAlerts } from '@/lib/services/alerts';
import { listTractorViews, type TractorView } from '@/lib/services/tractors';
import { filterViews } from '@/lib/tractorCard';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FilterTabs, FilterType } from '@/components/FilterTabs';
import { TractorCard } from '@/components/TractorCard';

export default function DashboardScreen() {
  const router = useRouter();
  const [views, setViews] = useState<TractorView[]>([]);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const today = todayLocal();
      const tractors = await db.tractors.list();
      // N2: kalendar bo'yicha muddati o'tganlar ham eslatma sifatida chiqishi uchun.
      for (const tr of tractors) await refreshAlerts(tr.id, today);
      setViews(await listTractorViews(today));
      const users = await db.users.list();
      const open: Record<string, string> = {};
      for (const m of await db.mechanicRequests.list()) {
        if (m.status === 'completed') continue;
        const tech = users.find((u) => u.id === m.technicianId)?.name;
        open[m.tractorId] = m.status === 'in_progress' ? t.dashboard.issueRepair(m.problem, tech ?? '') : t.dashboard.issueWaiting(m.problem);
      }
      setIssues(open);
      setUnread((await db.notifications.list()).filter((n) => !n.isRead).length);
      setFailed(false);
    } catch {
      setFailed(true);
      showMessage(t.common.error, t.errors.generic);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return onLiveTick(() => {
        load();
      });
    }, [load]),
  );

  const shown = filterViews(views, filter);
  const go = (path: string) => router.push(path as never);

  const header = (
    <DashboardHeader
      onAddTractor={() => go('/add-tractor')}
      onLogHours={() => go('/add-moto-hours')}
      onServiceHistory={() => go('/service-history')}
      onNotifications={() => go('/notifications')}
      onProfile={() => go('/profile')}
      onReports={() => go('/reports')}
      onNavigator={() => go('/navigator')}
      unreadCount={unread}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <FilterTabs activeFilter={filter} onFilterChange={setFilter} />
      {shown.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {failed ? t.errors.generic : filter === 'all' ? t.dashboard.empty : t.dashboard.emptyFilter}
          </Text>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(v) => v.tractor.id}
          renderItem={({ item }) => (
            <TractorCard
              view={item}
              issue={issues[item.tractor.id] ?? null}
              onPress={() => router.push({ pathname: '/tractor-details', params: { id: item.tractor.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
});
