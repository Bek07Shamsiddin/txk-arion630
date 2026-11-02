import { View, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BackupActions } from '@/components/BackupActions';
import { formStyles as s } from '@/components/formStyles';
import { t } from '@/lib/i18n/uz';

export default function BackupScreen() {
  const router = useRouter();
  const { refresh, user } = useSession();

  const reload = async () => {
    await refresh();
    router.replace('/(tabs)');
  };

  if (!Permissions.isAdmin(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.backup.title} onBack={() => router.back()} />
        <Text style={s.forbidden}>{t.backup.forbidden}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title={t.backup.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackupActions onRestored={reload} />
      </ScrollView>
    </View>
  );
}
