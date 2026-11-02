import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, Clock, CheckCircle, AlertTriangle, Phone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { MechanicRequest, Tractor, MechanicRequestStatus } from '@/lib/types';
import { formatRelativeTime, getCurrentTimestamp } from '@/lib/timezone';

interface MechanicRequestWithTractor extends MechanicRequest {
  tractor?: Tractor;
}

export default function MechanicRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MechanicRequestWithTractor[]>([]);
  const [filter, setFilter] = useState<MechanicRequestStatus | 'all'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState<string>('');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('mechanic_requests')
        .select(`
          *,
          tractor:tractors(*)
        `)
        .order('request_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load mechanic requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: MechanicRequestStatus) => {
    try {
      setUpdating(requestId);

      const updateData: any = {
        status: newStatus,
        updated_at: getCurrentTimestamp(),
      };

      if (newStatus === 'completed') {
        updateData.completed_at = getCurrentTimestamp();
      }

      const { error } = await supabase
        .from('mechanic_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      Alert.alert('Success', `Status updated to: ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const saveNotes = async (requestId: string, notes: string) => {
    try {
      setUpdating(requestId);

      const { error } = await supabase
        .from('mechanic_requests')
        .update({
          technician_notes: notes.trim() || null,
          updated_at: getCurrentTimestamp(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadRequests();
      setEditingNotes(null);
      setTechnicianNotes('');
      Alert.alert('Success', 'Notes saved successfully');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', error.message || 'Failed to save notes');
    } finally {
      setUpdating(null);
    }
  };

  const startEditingNotes = (request: MechanicRequestWithTractor) => {
    setEditingNotes(request.id);
    setTechnicianNotes(request.technician_notes || '');
  };

  const callTechnician = async () => {
    try {
      const { data: technicians, error } = await supabase
        .from('users')
        .select('phone, name')
        .eq('role', 'technician')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!technicians || !technicians.phone) {
        Alert.alert('No Technician Available', 'No active technician phone number found');
        return;
      }

      const phoneNumber = technicians.phone.replace(/[^0-9+]/g, '');

      Alert.alert(
        'Call Technician',
        `Call ${technicians.name} at ${technicians.phone}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call',
            onPress: async () => {
              const url = `tel:${phoneNumber}`;
              const canOpen = await Linking.canOpenURL(url);

              if (canOpen) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Error', 'Unable to make phone calls on this device');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error calling technician:', error);
      Alert.alert('Error', error.message || 'Failed to initiate call');
    }
  };

  const showStatusOptions = (request: MechanicRequestWithTractor) => {
    const statusOptions: MechanicRequestStatus[] = ['pending', 'in_progress', 'completed'];
    const currentStatus = request.status;

    const buttons = statusOptions
      .filter((status) => status !== currentStatus)
      .map((status) => ({
        text: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        onPress: () => updateStatus(request.id, status),
      }));

    buttons.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' } as any);

    Alert.alert('Update Status', `Current: ${currentStatus.replace('_', ' ')}`, buttons);
  };

  const getStatusIcon = (status: MechanicRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock size={18} color="#f59e0b" />;
      case 'in_progress':
        return <Wrench size={18} color="#3b82f6" />;
      case 'completed':
        return <CheckCircle size={18} color="#10b981" />;
    }
  };

  const getStatusColor = (status: MechanicRequestStatus) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'in_progress':
        return '#dbeafe';
      case 'completed':
        return '#d1fae5';
    }
  };


  const getPendingCount = () => requests.filter((r) => r.status === 'pending').length;
  const getInProgressCount = () => requests.filter((r) => r.status === 'in_progress').length;
  const getCompletedCount = () => requests.filter((r) => r.status === 'completed').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Mechanic Requests</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getPendingCount()}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{getInProgressCount()}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{getCompletedCount()}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wrench size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No mechanic requests found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'all' ? 'Try changing the filter' : 'Requests will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {requests.map((request) => (
            <View
              key={request.id}
              style={[styles.requestCard, { borderLeftColor: getStatusColor(request.status) }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.tractorInfo}>
                  <Text style={styles.tractorModel}>
                    {request.tractor?.model || 'Unknown Tractor'}
                  </Text>
                  <Text style={styles.tractorSerial}>
                    {request.tractor?.serial_number} • {request.tractor?.location}
                  </Text>
                </View>
                <View style={styles.urgencyBadge}>
                  <AlertTriangle size={14} color="#ef4444" />
                </View>
              </View>

              <View style={styles.operatorInfo}>
                <Text style={styles.operatorLabel}>Operator:</Text>
                <Text style={styles.operatorName}>{request.operator_name}</Text>
              </View>

              <View style={styles.problemSection}>
                <Text style={styles.problemLabel}>Problem Description:</Text>
                <Text style={styles.problemText}>{request.problem_description}</Text>
              </View>

              <View style={styles.timeInfo}>
                <Clock size={14} color="#6b7280" />
                <Text style={styles.timeText}>{formatRelativeTime(request.request_date)}</Text>
              </View>

              {request.technician_notes && editingNotes !== request.id && (
                <View style={styles.notesDisplay}>
                  <Text style={styles.notesLabel}>Technician Notes:</Text>
                  <Text style={styles.notesText}>{request.technician_notes}</Text>
                </View>
              )}

              {editingNotes === request.id && (
                <View style={styles.notesEditor}>
                  <Text style={styles.notesLabel}>Technician Notes:</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes about diagnosis, repairs, or next steps..."
                    value={technicianNotes}
                    onChangeText={setTechnicianNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.notesActions}>
                    <TouchableOpacity
                      style={styles.notesCancelButton}
                      onPress={() => {
                        setEditingNotes(null);
                        setTechnicianNotes('');
                      }}
                    >
                      <Text style={styles.notesCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notesSaveButton}
                      onPress={() => saveNotes(request.id, technicianNotes)}
                      disabled={updating === request.id}
                    >
                      {updating === request.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.notesSaveText}>Save Notes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View
                style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}
              >
                {getStatusIcon(request.status)}
                <Text style={styles.statusText}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('_', ' ')}
                </Text>
              </View>

              {request.completed_at && (
                <Text style={styles.completedText}>
                  Completed: {formatRelativeTime(request.completed_at)}
                </Text>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={callTechnician}
                  activeOpacity={0.7}
                >
                  <Phone size={16} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Ustaga telefon qilish</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.statusButton,
                    updating === request.id && styles.actionButtonDisabled,
                  ]}
                  onPress={() => showStatusOptions(request)}
                  disabled={updating === request.id}
                  activeOpacity={0.7}
                >
                  {updating === request.id && !editingNotes ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Update Status</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.notesButton,
                    updating === request.id && styles.actionButtonDisabled,
                  ]}
                  onPress={() => startEditingNotes(request)}
                  disabled={updating === request.id || editingNotes === request.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>
                    {request.technician_notes ? 'Edit Notes' : 'Add Notes'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f59e0b',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  content: {
    flex: 1,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tractorInfo: {
    flex: 1,
  },
  tractorModel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tractorSerial: {
    fontSize: 13,
    color: '#6b7280',
  },
  urgencyBadge: {
    padding: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  operatorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  operatorLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginRight: 8,
  },
  operatorName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  problemSection: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  problemLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  problemText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  notesDisplay: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  notesEditor: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  notesCancelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  notesCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  notesSaveButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  notesSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  completedText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  statusButton: {
    backgroundColor: '#1f2937',
  },
  notesButton: {
    backgroundColor: '#3b82f6',
  },
  callButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
