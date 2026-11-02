import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { SessionProvider, useSession } from '@/lib/session';
import { initDb } from '@/lib/db';
import { CorruptDataError } from '@/lib/db/storage';
import { BackupActions } from '@/components/BackupActions';
import { t } from '@/lib/i18n/uz';

function errorMessage(e: Error): string {
  return e instanceof CorruptDataError ? t.errors.corruptData : t.errors.generic;
}

function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Buzilgan ma'lumot: faqat tiklash amallari ko'rsatiladi. */
function RecoveryView({ onRestored }: { onRestored: () => void }) {
  return (
    <View style={styles.recovery}>
      <Text style={styles.errorText}>{t.errors.corruptData}</Text>
      <Text style={styles.recoveryHint}>{t.backup.recoveryHint}</Text>
      <View style={styles.recoveryActions}>
        <BackupActions mode="recovery" onRestored={onRestored} />
      </View>
    </View>
  );
}

function RootLayoutNav({ onReload }: { onReload: () => void }) {
  const { user, loading, error } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || error) return;
    const onSelect = segments[0] === 'select-user';
    if (!user && !onSelect) {
      router.replace('/select-user');
    } else if (user && onSelect) {
      router.replace('/(tabs)');
    }
  }, [user, loading, error, segments]);

  if (error instanceof CorruptDataError) return <RecoveryView onRestored={onReload} />;
  if (error) return <ErrorView message={errorMessage(error)} />;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="select-user" options={{ headerShown: false }} />
        <Stack.Screen name="users-admin" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-tractor" />
        <Stack.Screen name="add-moto-hours" />
        <Stack.Screen name="service-history" />
        <Stack.Screen name="add-service-record" />
        <Stack.Screen name="report-damage" />
        <Stack.Screen name="request-parts" />
        <Stack.Screen name="parts-admin" />
        <Stack.Screen name="parts-history" />
        <Stack.Screen name="request-mechanic" />
        <Stack.Screen name="mechanic-requests" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="simulator" />
        <Stack.Screen name="regulation-admin" />
        <Stack.Screen name="backup" />
        <Stack.Screen name="navigator" />
        <Stack.Screen name="tractor-details" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    initDb()
      .then(() => {
        setInitError(null);
        setReady(true);
      })
      .catch((e) => setInitError(e as Error));
  }, [epoch]);

  const reload = () => {
    setInitError(null);
    setReady(false);
    setEpoch((n) => n + 1);
  };

  if (initError instanceof CorruptDataError) return <RecoveryView onRestored={reload} />;
  if (initError) return <ErrorView message={errorMessage(initError)} />;
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t.common.loading}</Text>
      </View>
    );
  }

  return (
    <SessionProvider key={epoch}>
      <RootLayoutNav onReload={reload} />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  errorText: { fontSize: 16, color: '#b91c1c', textAlign: 'center' },
  recovery: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  recoveryHint: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  recoveryActions: { marginTop: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
});
