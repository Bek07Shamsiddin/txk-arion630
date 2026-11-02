import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type FilterType = 'all' | 'service-required';

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeFilter === 'all' && styles.tabActive,
        ]}
        onPress={() => onFilterChange('all')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            activeFilter === 'all' && styles.tabTextActive,
          ]}
        >
          All Tractors
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeFilter === 'service-required' && styles.tabActive,
        ]}
        onPress={() => onFilterChange('service-required')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            activeFilter === 'service-required' && styles.tabTextActive,
          ]}
        >
          Service Required
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1f2937',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});
