import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Tractor } from '@/lib/types';
import { getTractorServiceStatus } from '@/lib/tractorStatus';
import { getAllTractorsLiveData, TractorLiveData } from '@/lib/liveMonitoring';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FilterTabs, FilterType } from '@/components/FilterTabs';
import { TractorCard } from '@/components/TractorCard';

interface TractorWithLastService extends Tractor {
  lastServiceDate?: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [tractors, setTractors] = useState<TractorWithLastService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [liveData, setLiveData] = useState<Map<string, TractorLiveData>>(new Map());

  const loadTractors = useCallback(async () => {
    try {
      const { data: tractorData, error: tractorError } = await supabase
        .from('tractors')
        .select('*')
        .order('updated_at', { ascending: false });

      if (tractorError) throw tractorError;

      if (tractorData) {
        const tractorsWithLastService = await Promise.all(
          tractorData.map(async (tractor) => {
            const { data: serviceData } = await supabase
              .from('service_logs')
              .select('date')
              .eq('tractor_id', tractor.id)
              .order('date', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...tractor,
              lastServiceDate: serviceData?.date,
            };
          })
        );

        setTractors(tractorsWithLastService);
      }
    } catch (error) {
      console.error('Error loading tractors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('service_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  }, []);

  const loadLiveData = useCallback(async () => {
    try {
      const data = await getAllTractorsLiveData();
      setLiveData(data);
    } catch (error) {
      console.error('Error loading live data:', error);
    }
  }, []);

  useEffect(() => {
    loadTractors();
    loadUnreadCount();
    loadLiveData();

    const tractorSubscription = supabase
      .channel('tractors-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tractors' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTractors((prev) => [payload.new as TractorWithLastService, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTractors((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? { ...t, ...payload.new } : t
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTractors((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
          loadLiveData();
        }
      )
      .subscribe();

    const notificationSubscription = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_notifications' },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    const partsSubscription = supabase
      .channel('parts-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts_requests' },
        () => {
          loadLiveData();
        }
      )
      .subscribe();

    const callsSubscription = supabase
      .channel('calls-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'technician_calls' },
        () => {
          loadLiveData();
        }
      )
      .subscribe();

    const liveDataInterval = setInterval(() => {
      loadLiveData();
    }, 10000);

    return () => {
      tractorSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
      partsSubscription.unsubscribe();
      callsSubscription.unsubscribe();
      clearInterval(liveDataInterval);
    };
  }, [loadTractors, loadUnreadCount, loadLiveData]);

  useFocusEffect(
    useCallback(() => {
      loadTractors();
      loadUnreadCount();
      loadLiveData();
    }, [loadTractors, loadUnreadCount, loadLiveData])
  );

  const filteredTractors = tractors.filter((tractor) => {
    if (filter === 'service-required') {
      const status = getTractorServiceStatus(tractor);
      return status.color === 'red' || status.color === 'yellow';
    }
    return true;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadTractors();
  };

  const handleAddTractor = () => {
    router.push('/add-tractor');
  };

  const handleLogHours = () => {
    router.push('/add-moto-hours');
  };

  const handleServiceHistory = () => {
    router.push('/service-history');
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const handleReports = () => {
    router.push('/reports');
  };

  const handleNavigator = () => {
    router.push('/navigator');
  };

  const handleTractorPress = (tractorId: string) => {
    router.push({
      pathname: '/tractor-details',
      params: { id: tractorId },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <DashboardHeader
          onAddTractor={handleAddTractor}
          onLogHours={handleLogHours}
          onServiceHistory={handleServiceHistory}
          onNotifications={handleNotifications}
          onProfile={handleProfile}
          onReports={handleReports}
          onNavigator={handleNavigator}
          unreadCount={unreadNotifications}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DashboardHeader
        onAddTractor={handleAddTractor}
        onLogHours={handleLogHours}
        onServiceHistory={handleServiceHistory}
        onNotifications={handleNotifications}
        onProfile={handleProfile}
        onReports={handleReports}
        onNavigator={handleNavigator}
        unreadCount={unreadNotifications}
      />

      <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

      {filteredTractors.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {filter === 'service-required'
              ? 'No tractors requiring service'
              : 'No tractors found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTractors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TractorCard
              tractor={item}
              lastServiceDate={item.lastServiceDate}
              liveData={liveData.get(item.id)}
              onPress={() => handleTractorPress(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
