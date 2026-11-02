import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Phone, Shield, User, Wrench, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/types';

interface ContactUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  rating?: number;
  badge_level?: string;
  service_types?: string[];
}

export default function NavigatorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ContactUser[]>([]);
  const [filter, setFilter] = useState<'all' | UserRole>('all');

  useEffect(() => {
    loadContacts();
  }, [filter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('users')
        .select('id, name, phone, role, is_active, rating, badge_level, service_types')
        .eq('is_active', true)
        .order('role')
        .order('name');

      if (filter !== 'all') {
        query = query.eq('role', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', error.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const makeCall = async (contact: ContactUser) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Call Not Supported',
        'Your device does not support direct calling. Please use a mobile device.',
        [{ text: 'OK' }]
      );
      return;
    }

    const phoneNumber = contact.phone.replace(/[^0-9+]/g, '');

    if (!phoneNumber) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    Alert.alert(
      'Call Contact',
      `Call ${contact.name} (${getRoleLabel(contact.role)}) at ${contact.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const url = `tel:${phoneNumber}`;
              const canOpen = await Linking.canOpenURL(url);

              if (canOpen) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Error', 'Unable to make phone calls on this device');
              }
            } catch (error: any) {
              console.error('Error making call:', error);
              Alert.alert('Error', 'Failed to initiate call');
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: UserRole): string => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={20} color="#ef4444" />;
      case 'technician':
        return <Wrench size={20} color="#3b82f6" />;
      case 'operator':
        return <User size={20} color="#10b981" />;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'technician':
        return '#3b82f6';
      case 'operator':
        return '#10b981';
    }
  };

  const getBadgeInfo = (badgeLevel?: string) => {
    switch (badgeLevel) {
      case 'elite':
        return { label: '★ Elite', color: '#f59e0b' };
      case 'pro':
        return { label: '★ Pro', color: '#3b82f6' };
      case 'standard':
        return { label: '★ Standard', color: '#6b7280' };
      case 'needs_improvement':
        return { label: '★ Needs Improvement', color: '#ef4444' };
      default:
        return { label: '★ Standard', color: '#6b7280' };
    }
  };

  const renderContact = (contact: ContactUser) => {
    const badge = getBadgeInfo(contact.badge_level);

    return (
      <View key={contact.id} style={styles.contactCard}>
        <View style={styles.contactHeader}>
          <View style={styles.contactInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.role === 'technician' && contact.rating !== undefined && (
                <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                  <Star size={12} color={badge.color} fill={badge.color} />
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {contact.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.roleRow}>
              {getRoleIcon(contact.role)}
              <Text style={[styles.roleText, { color: getRoleColor(contact.role) }]}>
                {getRoleLabel(contact.role)}
              </Text>
            </View>

            {contact.role === 'technician' && contact.badge_level && (
              <View style={[styles.badgeLevelContainer, { borderLeftColor: badge.color }]}>
                <Text style={[styles.badgeLevelText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            )}

            {contact.role === 'technician' && contact.service_types && contact.service_types.length > 0 && (
              <View style={styles.servicesContainer}>
                <Text style={styles.servicesLabel}>Services:</Text>
                <Text style={styles.servicesText} numberOfLines={2}>
                  {contact.service_types.slice(0, 3).join(', ')}
                  {contact.service_types.length > 3 && '...'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.contactActions}>
          <View style={styles.phoneInfo}>
            <Phone size={16} color="#6b7280" />
            <Text style={styles.phoneText}>{contact.phone}</Text>
          </View>

          <TouchableOpacity
            style={[styles.callButton, { backgroundColor: getRoleColor(contact.role) }]}
            onPress={() => makeCall(contact)}
            activeOpacity={0.7}
          >
            <Phone size={16} color="#ffffff" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTechnicianCount = () => users.filter((u) => u.role === 'technician').length;
  const getAdminCount = () => users.filter((u) => u.role === 'admin').length;
  const getOperatorCount = () => users.filter((u) => u.role === 'operator').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Navigator</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Shield size={20} color="#ef4444" />
          <Text style={styles.statValue}>{getAdminCount()}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Wrench size={20} color="#3b82f6" />
          <Text style={styles.statValue}>{getTechnicianCount()}</Text>
          <Text style={styles.statLabel}>Technicians</Text>
        </View>
        <View style={styles.statCard}>
          <User size={20} color="#10b981" />
          <Text style={styles.statValue}>{getOperatorCount()}</Text>
          <Text style={styles.statLabel}>Operators</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              All Contacts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'admin' && styles.filterButtonActive]}
            onPress={() => setFilter('admin')}
            activeOpacity={0.7}
          >
            <Shield size={16} color={filter === 'admin' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.filterButtonText, filter === 'admin' && styles.filterButtonTextActive]}>
              Administrators
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'technician' && styles.filterButtonActive]}
            onPress={() => setFilter('technician')}
            activeOpacity={0.7}
          >
            <Wrench size={16} color={filter === 'technician' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.filterButtonText, filter === 'technician' && styles.filterButtonTextActive]}>
              Technicians
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'operator' && styles.filterButtonActive]}
            onPress={() => setFilter('operator')}
            activeOpacity={0.7}
          >
            <User size={16} color={filter === 'operator' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.filterButtonText, filter === 'operator' && styles.filterButtonTextActive]}>
              Operators
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'all' ? 'Try changing the filter' : 'No active users in the system'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {users.map(renderContact)}
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
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactHeader: {
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeLevelContainer: {
    paddingLeft: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  badgeLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  servicesContainer: {
    marginTop: 4,
  },
  servicesLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  servicesText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  phoneText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
