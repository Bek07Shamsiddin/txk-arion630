import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { getRoleColor, getRoleName } from '@/lib/permissions';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { confirmAction, showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';
import { goBack } from '@/lib/nav';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  const switchUser = async () => {
    if (!(await confirmAction(t.profile.switchUser, t.profile.switchConfirm))) return;
    setBusy(true);
    try {
      await signOut();
      router.replace('/select-user');
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={t.profile.title} onBack={() => goBack(router)} />
      {user ? (
        <View style={s.scroll}>
          <View style={s.group}>
            <Text style={s.label}>{t.profile.name}</Text>
            <Text style={s.cardTitle}>{user.name}</Text>
          </View>
          <View style={s.group}>
            <Text style={s.label}>{t.profile.role}</Text>
            <View style={[s.badge, { backgroundColor: getRoleColor(user.role), marginTop: 0 }]}>
              <Text style={[s.badgeText, { color: '#ffffff' }]}>{getRoleName(user.role)}</Text>
            </View>
          </View>
          <TouchableOpacity style={[s.submit, busy && s.submitDisabled]} onPress={switchUser} disabled={busy}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitText}>{t.profile.switchUser}</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={s.forbidden}>{t.profile.noUser}</Text>
      )}
    </View>
  );
}
