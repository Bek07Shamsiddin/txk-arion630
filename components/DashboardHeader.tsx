import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Plus, User, BarChart3, Clock, Bell, Wrench, Navigation } from 'lucide-react-native';

interface DashboardHeaderProps {
  onAddTractor: () => void;
  onLogHours: () => void;
  onServiceHistory: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onReports: () => void;
  onNavigator: () => void;
  unreadCount?: number;
}

export function DashboardHeader({
  onAddTractor,
  onLogHours,
  onServiceHistory,
  onNotifications,
  onProfile,
  onReports,
  onNavigator,
  unreadCount = 0
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Tractors</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotifications}
          activeOpacity={0.7}
        >
          <Bell size={24} color="#ffffff" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={onAddTractor}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onLogHours}
            activeOpacity={0.7}
          >
            <Clock size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onServiceHistory}
            activeOpacity={0.7}
          >
            <Wrench size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onNavigator}
            activeOpacity={0.7}
          >
            <Navigation size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onProfile}
            activeOpacity={0.7}
          >
            <User size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={onReports}
            activeOpacity={0.7}
          >
            <BarChart3 size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
