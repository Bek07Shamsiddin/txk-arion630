import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { PartsRequest, Tractor, DeliveryStatus } from '@/lib/types';

export default function PartsHistoryScreen() {
  const router = useRouter();
  const { tractorId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [tractor, setTractor] = useState<Tractor | null>(null);
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');

  useEffect(() => {
    if (tractorId) {
      loadData();
    }
  }, [tractorId, filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: tractorData, error: tractorError } = await supabase
        .from('tractors')
        .select('*')
        .eq('id', tractorId)
        .single();

      if (tractorError) throw tractorError;
      setTractor(tractorData);

      let query = supabase
        .from('parts_requests')
        .select('*')
        .eq('tractor_id', tractorId)
        .order('request_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('delivery_status', filter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load parts history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="#f59e0b" />;
      case 'ordered':
        return <Package size={16} color="#3b82f6" />;
      case 'in_transit':
        return <Truck size={16} color="#8b5cf6" />;
      case 'delivered':
        return <CheckCircle size={16} color="#10b981" />;
      case 'cancelled':
        return <XCircle size={16} color="#ef4444" />;
    }
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'ordered':
        return '#dbeafe';
      case 'in_transit':
        return '#ede9fe';
      case 'delivered':
        return '#d1fae5';
      case 'cancelled':
        return '#fee2e2';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'normal':
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTotalRequests = () => requests.length;
  const getPendingCount = () => requests.filter(r => r.delivery_status === 'pending').length;
  const getDeliveredCount = () => requests.filter(r => r.delivery_status === 'delivered').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Parts History</Text>
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
        <Text style={styles.title}>Parts History</Text>
        <View style={styles.placeholder} />
      </View>

      {tractor && (
        <View style={styles.tractorInfo}>
          <View>
            <Text style={styles.tractorModel}>{tractor.model}</Text>
            <Text style={styles.tractorSerial}>{tractor.serial_number}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getTotalRequests()}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{getPendingCount()}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{getDeliveredCount()}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'ordered', 'in_transit', 'delivered'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, filter === status && styles.filterButtonActive]}
              onPress={() => setFilter(status)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === status && styles.filterButtonTextActive,
                ]}
              >
                {status === 'all'
                  ? 'All'
                  : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No parts requests found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'all'
              ? 'Try changing the filter'
              : 'Parts requests for this tractor will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {requests.map((request) => (
            <View
              key={request.id}
              style={[
                styles.requestCard,
                { borderLeftColor: getStatusColor(request.delivery_status) },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <Package size={18} color="#1f2937" />
                  <Text style={styles.partName}>{request.part_name}</Text>
                </View>
                <View
                  style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(request.urgency) },
                  ]}
                >
                  <Text style={styles.urgencyText}>{request.urgency.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity:</Text>
                  <Text style={styles.detailValue}>{request.quantity}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Requested by:</Text>
                  <Text style={styles.detailValue}>{request.requested_by || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Request Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(request.request_date)}</Text>
                </View>

                {request.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{request.notes}</Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.delivery_status) },
                ]}
              >
                {getStatusIcon(request.delivery_status)}
                <Text style={styles.statusText}>
                  {request.delivery_status.charAt(0).toUpperCase() +
                    request.delivery_status.slice(1).replace('_', ' ')}
                </Text>
              </View>

              {request.delivered_at && (
                <Text style={styles.deliveredText}>
                  Delivered: {formatDate(request.delivered_at)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
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
  tractorInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tractorModel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tractorSerial: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1f2937',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  deliveredText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 6,
  },
});
