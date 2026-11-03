import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { BackupData } from './db/schema';

/** Matnni fayl sifatida ulashadi (vebda yuklab olish, mobilda ulashish oynasi). */
async function shareText(fileName: string, text: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName });
}

export function shareJson(data: BackupData, fileName?: string): Promise<void> {
  const name = fileName ?? `txk-zaxira-${data.exportedAt.slice(0, 10)}.json`;
  return shareText(name, JSON.stringify(data, null, 2), 'application/json');
}

export function shareCsv(name: string, csv: string): Promise<void> {
  return shareText(name, csv, 'text/csv');
}

/** Zaxira faylini tanlatadi va matnini qaytaradi; bekor qilinsa null. */
export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file.text();
    return (await fetch(asset.uri)).text();
  }
  return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
}
