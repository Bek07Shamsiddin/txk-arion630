import { Alert, Platform } from 'react-native';

/** Xabar ko'rsatadi (vebda Alert.alert ishlamaydi, shuning uchun window.alert). */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Tasdiqlash so'raydi; foydalanuvchi "Ha" desa true. */
export function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(message ? `${title}\n${message}` : title);
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Yo‘q', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Ha', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
