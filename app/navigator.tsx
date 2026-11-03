import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

type SessionUser = ReturnType<typeof useSession>['user'];
type Item = { label: string; path: string; visible: (u: SessionUser) => boolean };

const always = () => true;
const ITEMS: Item[] = [
  { label: t.menu.hoursLog, path: '/add-moto-hours', visible: (u) => Permissions.canLogMotoHours(u) },
  { label: t.menu.service, path: '/service-history', visible: (u) => Permissions.canViewServiceHistory(u) },
  { label: t.menu.parts, path: '/request-parts', visible: (u) => Permissions.canRequestParts(u) },
  { label: t.menu.partsAdmin, path: '/parts-admin', visible: (u) => Permissions.canManageParts(u) },
  { label: t.menu.mechanic, path: '/request-mechanic', visible: (u) => Permissions.canRequestMechanic(u) },
  { label: t.menu.mechanicList, path: '/mechanic-requests', visible: (u) => Permissions.canManageMechanicRequests(u) },
  { label: t.menu.damage, path: '/report-damage', visible: (u) => Permissions.canReportDamage(u) },
  { label: t.menu.reports, path: '/reports', visible: (u) => Permissions.canViewReports(u) },
  { label: t.menu.notifications, path: '/notifications', visible: always },
  { label: t.menu.profile, path: '/profile', visible: always },
  { label: t.menu.simulator, path: '/simulator', visible: always },
  { label: t.menu.regulation, path: '/regulation-admin', visible: (u) => Permissions.isAdmin(u) },
  { label: t.menu.backup, path: '/backup', visible: (u) => Permissions.isAdmin(u) },
  { label: t.menu.users, path: '/users-admin', visible: (u) => Permissions.isAdmin(u) },
];

export default function NavigatorScreen() {
  const router = useRouter();
  const { user } = useSession();
  const items = ITEMS.filter((i) => i.visible(user));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack(router)} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.menu.title}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((i) => (
          <TouchableOpacity key={i.path} style={styles.item} activeOpacity={0.7} onPress={() => router.push(i.path as never)}>
            <Text style={styles.itemText}>{i.label}</Text>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
});
