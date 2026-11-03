import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export const MAX_SIDE = 1280;

/** Eng uzun tomoni MAX_SIDE dan oshmasligi uchun o'lcham. */
export function fitSize(w: number, h: number, max = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const k = max / longest;
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

/**
 * Rasmni kichraytiradi (eng uzun tomon 1280 px) va ilova hujjatlar papkasiga (media/) nusxalaydi.
 * Vebda data-URI qaytaradi. Natija: saqlangan URI.
 */
export async function saveImage(uri: string): Promise<string> {
  const probe = await ImageManipulator.manipulateAsync(uri, [], {});
  const { width, height } = fitSize(probe.width, probe.height);
  const resize = width === probe.width ? [] : [{ resize: { width, height } }];
  const compress = 0.8;
  if (Platform.OS === 'web') {
    const r = await ImageManipulator.manipulateAsync(uri, resize, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return `data:image/jpeg;base64,${r.base64}`;
  }
  const r = await ImageManipulator.manipulateAsync(uri, resize, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const dir = `${FileSystem.documentDirectory}media/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const dest = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await FileSystem.copyAsync({ from: r.uri, to: dest });
  return dest;
}
