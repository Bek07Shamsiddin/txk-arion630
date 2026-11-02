import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formStyles as s } from '@/components/formStyles';
import { confirmAction, showMessage } from '@/lib/notify';
import { pickBackupFile, shareJson } from '@/lib/share';
import {
  exportAll,
  getAutoBackupInfo,
  getLastExportAt,
  importAll,
  markExported,
  restoreAutoBackup,
} from '@/lib/db/backup';
import { todayLocal } from '@/lib/core/dates';
import { t } from '@/lib/i18n/uz';

type Props = {
  /** 'recovery' rejimida zaxira olish ko'rsatilmaydi (ma'lumot buzilgan). */
  mode?: 'full' | 'recovery';
  /** Muvaffaqiyatli tiklangandan keyin chaqiriladi (ilovani qayta yuklash). */
  onRestored: () => void | Promise<void>;
};

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** Zaxira amallari: eksport, fayldan tiklash, avtomatik zaxiradan qaytarish. */
export function BackupActions({ mode = 'full', onRestored }: Props) {
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [auto, setAuto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLastExport(await getLastExportAt());
    setAuto((await getAutoBackupInfo())?.savedAt ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      showMessage(t.common.error, (e as Error).message || t.errors.generic);
    } finally {
      setBusy(false);
      load();
    }
  };

  const doExport = () =>
    run(async () => {
      const data = await exportAll();
      await shareJson(data, `txk-zaxira-${todayLocal()}.json`);
      await markExported();
      showMessage(t.backup.title, t.backup.exported);
    });

  const doImport = () =>
    run(async () => {
      const text = await pickBackupFile();
      if (text === null) return;
      if (!(await confirmAction(t.backup.replaceTitle, t.backup.replaceMessage))) return;
      await importAll(text);
      showMessage(t.backup.title, t.backup.imported);
      await onRestored();
    });

  const doRestoreAuto = () =>
    run(async () => {
      if (!(await confirmAction(t.backup.restoreAutoTitle, t.backup.restoreAutoMessage))) return;
      await restoreAutoBackup();
      showMessage(t.backup.title, t.backup.restoredAuto);
      await onRestored();
    });

  return (
    <View>
      {mode === 'full' && (
        <>
          <Text style={s.cardMeta}>
            {t.backup.lastExport}: {fmt(lastExport) ?? t.backup.neverExported}
          </Text>
          <Text style={[s.cardMeta, { marginBottom: 16 }]}>{t.backup.exportHint}</Text>
          <TouchableOpacity style={[s.submit, busy && s.submitDisabled, { marginBottom: 12 }]} onPress={doExport} disabled={busy}>
            <Text style={s.submitText}>{t.backup.export}</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={[s.submit, busy && s.submitDisabled, { marginBottom: 12 }]} onPress={doImport} disabled={busy}>
        <Text style={s.submitText}>{t.backup.import}</Text>
      </TouchableOpacity>
      <Text style={s.cardMeta}>
        {t.backup.autoInfo}: {fmt(auto) ?? t.backup.noAuto}
      </Text>
      <TouchableOpacity
        style={[s.submit, (busy || !auto) && s.submitDisabled, { marginTop: 8 }]}
        onPress={doRestoreAuto}
        disabled={busy || !auto}
      >
        <Text style={s.submitText}>{t.backup.restoreAuto}</Text>
      </TouchableOpacity>
      {busy && <ActivityIndicator style={{ marginTop: 16 }} color="#3b82f6" />}
    </View>
  );
}
