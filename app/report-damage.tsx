import { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { db } from '@/lib/db';
import { todayLocal } from '@/lib/core/dates';
import { listTractorViews, type TractorView } from '@/lib/services/tractors';
import { saveImage } from '@/lib/media';
import { TractorPicker } from '@/components/TractorPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { showMessage } from '@/lib/notify';
import { t } from '@/lib/i18n/uz';

export default function ReportDamageScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ tractorId?: string }>();
  const [views, setViews] = useState<TractorView[]>([]);
  const [tractorId, setTractorId] = useState<string | null>(params.tractorId ? String(params.tractorId) : null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const vs = await listTractorViews(todayLocal());
          if (alive) setViews(vs);
        } catch (e) {
          showMessage(t.common.error, (e as Error).message || t.errors.storage);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!tractorId && views.length === 1) setTractorId(views[0].tractor.id);
  }, [views, tractorId]);

  if (!Permissions.canReportDamage(user)) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.damage.title} onBack={() => router.back()} />
        <Text style={s.forbidden}>{t.damage.forbidden}</Text>
      </View>
    );
  }

  const pick = async (camera: boolean) => {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) {
        const uri = await saveImage(res.assets[0].uri);
        setPhotos((p) => [...p, uri]);
      }
    } catch (e) {
      showMessage(t.common.error, (e as Error).message);
    }
  };

  const submit = async () => {
    if (!user || !tractorId) return;
    if (!description.trim()) {
      setError(t.damage.required);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await db.damageReports.insert({
        tractorId,
        description: description.trim(),
        photoUris: photos,
        date: todayLocal(),
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      showMessage(t.damage.title, t.damage.sent);
      router.back();
    } catch (err) {
      showMessage(t.common.error, (err as Error).message || t.errors.storage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={t.damage.title} onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.group}>
            <Text style={s.label}>{t.hours.tractor}</Text>
            <TractorPicker views={views} selectedId={tractorId} onSelect={setTractorId} />
          </View>

          {tractorId ? (
            <>
              <View style={s.group}>
                <Text style={s.label}>{t.damage.description}</Text>
                <TextInput
                  style={[s.input, s.multiline, error ? s.inputError : null]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
                {error ? <Text style={s.error}>{error}</Text> : null}
              </View>

              <View style={s.group}>
                <Text style={s.label}>{t.damage.photos}</Text>
                <View style={s.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={uri + i}>
                      <Image source={{ uri }} style={s.photo} />
                      <TouchableOpacity onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>
                        <Text style={s.link}>{t.damage.removePhoto}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={s.photoButtons}>
                  <TouchableOpacity style={s.photoButton} onPress={() => pick(false)}>
                    <Text style={s.photoButtonText}>{t.damage.pickPhoto}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoButton} onPress={() => pick(true)}>
                    <Text style={s.photoButtonText}>{t.damage.takePhoto}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[s.submit, saving && s.submitDisabled]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={s.submitText}>{t.damage.send}</Text>}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
