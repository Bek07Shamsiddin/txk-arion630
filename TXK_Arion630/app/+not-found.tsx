import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/i18n/uz';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t.notFound.title }} />
      <View style={styles.container}>
        <Text style={styles.text}>{t.notFound.text}</Text>
        <Link href="/" style={styles.link}>
          <Text>{t.notFound.home}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
