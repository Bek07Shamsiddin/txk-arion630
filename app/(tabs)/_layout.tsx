import { Tabs } from 'expo-router';
import { t } from '@/lib/i18n/uz';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.menu.title,
        }}
      />
    </Tabs>
  );
}
