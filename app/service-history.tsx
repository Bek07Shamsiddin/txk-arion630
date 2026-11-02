import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Wrench, Calendar, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatDate, formatDateTime } from '@/lib/timezone';

interface ServiceLog {
  id: string;
  tractor_id: string;
  service_type: string;
  moto_hour: number;
  date: string;
  used_parts: any[];
  technician_note: string | null;
  uploaded_photos: string[];
  technician_id: string | null;
  created_at: string;
  tractor?: {
    model: string;
    serial_number: string;
  };
  technician?: {
    name: string;
  };
}

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadServiceLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('service_logs')
        .select(
          `
          *,
          tractor:tractors(model, serial_number),
          technician:users(name)
        `
        )
        .order('date', { ascending: false });

      if (error) throw error;

      setServiceLogs(data || []);
    } catch (error) {
      console.error('Error loading service logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadServiceLogs();

    const subscription = supabase
      .channel('service-logs-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_logs' },
        () => {
          loadServiceLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadServiceLogs]);

  useFocusEffect(
    useCallback(() => {
      loadServiceLogs();
    }, [loadServiceLogs])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadServiceLogs();
  };

  const handleAddService = () => {
    router.push('/add-service-record');
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderServiceLog = ({ item }: { item: ServiceLog }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => toggleExpanded(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.serviceHeader}>
          <View style={styles.serviceHeaderLeft}>
            <View style={styles.iconWrapper}>
              <Wrench size={20} color="#ffffff" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceType}>{item.service_type}</Text>
              {item.tractor && (
                <Text style={styles.tractorInfo}>
                  {item.tractor.model} • {item.tractor.serial_number}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.serviceHeaderRight}>
            <Text style={styles.hoursText}>{item.moto_hour}h</Text>
          </View>
        </View>

        <View style={styles.serviceMetrics}>
          <View style={styles.metricItem}>
            <Calendar size={14} color="#6b7280" />
            <Text style={styles.metricText}>
              {formatDate(item.date)}
            </Text>
          </View>
          {item.technician && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Tech:</Text>
              <Text style={styles.metricText}>{item.technician.name}</Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {item.used_parts && item.used_parts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Used Parts</Text>
                {item.used_parts.map((part: any, index: number) => (
                  <View key={index} style={styles.partItem}>
                    <Text style={styles.partName}>• {part.name || part.part_name}</Text>
                    {part.quantity && (
                      <Text style={styles.partQuantity}>Qty: {part.quantity}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {item.technician_note && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Technician Notes</Text>
                <Text style={styles.noteText}>{item.technician_note}</Text>
              </View>
            )}

            {item.uploaded_photos && item.uploaded_photos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoScroll}
                >
                  {item.uploaded_photos.map((photoUrl: string, index: number) => (
                    <Image
                      key={index}
                      source={{ uri: photoUrl }}
                      style={styles.photo}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.recordedText}>
                Recorded: {formatDateTime(item.created_at)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Service History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Service History</Text>
        <TouchableOpacity onPress={handleAddService} style={styles.addButton}>
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {serviceLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wrench size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Service Records</Text>
          <Text style={styles.emptyText}>
            Service records will appear here when maintenance is performed on tractors.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddService}>
            <Plus size={20} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Add First Record</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={serviceLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceLog}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tractorInfo: {
    fontSize: 13,
    color: '#6b7280',
  },
  serviceHeaderRight: {
    backgroundColor: '#dbeafe',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  hoursText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  serviceMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricText: {
    fontSize: 12,
    color: '#374151',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  partName: {
    fontSize: 13,
    color: '#4b5563',
  },
  partQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  noteText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  photoScroll: {
    marginTop: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#e5e7eb',
  },
  recordedText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
