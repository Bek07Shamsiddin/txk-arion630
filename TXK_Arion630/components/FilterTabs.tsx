import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { t } from '@/lib/i18n/uz';
import type { DashboardFilter } from '@/lib/tractorCard';

export type FilterType = DashboardFilter;

const TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: t.dashboard.filterAll },
  { key: 'ok', label: t.dashboard.filterOk },
  { key: 'soon', label: t.dashboard.filterSoon },
  { key: 'overdue', label: t.dashboard.filterOverdue },
];

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
          onPress={() => onFilterChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeFilter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#ffffff' },
  tab: { minHeight: 36, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive: { backgroundColor: '#1f2937' },
  tabText: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#ffffff' },
});
