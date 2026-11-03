import AsyncStorage from '@react-native-async-storage/async-storage';

export type AlertPrefs = { sound: boolean; vibration: boolean };
const KEY = 'pref:alerts';
const DEFAULT: AlertPrefs = { sound: true, vibration: true };

export async function getAlertPrefs(): Promise<AlertPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function setAlertPrefs(p: AlertPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}
