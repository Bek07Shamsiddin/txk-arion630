import { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { parseDecimal } from '@/lib/core/numbers';
import { isIsoDate, todayLocal } from '@/lib/core/dates';
import { registerTractor } from '@/lib/services/tractors';
import { saveImage } from '@/lib/media';
import { t } from '@/lib/i18n/uz';

export default function AddTractorScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    model: t.tractor.defaultModel,
    serialNumber: '',
    location: '',
    operatorName: '',
    registrationDate: todayLocal(),
    initialReading: '0',
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (text: string) => {
    setForm((f) => ({ ...f, [key]: text }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  if (!Permissions.canAddTractor(user)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{t.tractor.addTitle}</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.forbidden}>{t.tractor.forbidden}</Text>
      </View>
    );
  }

  const pick = async (camera: boolean) => {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const res = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) setPhotoUri(await saveImage(res.assets[0].uri));
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    }
  };

  const validate = (): { initialReading: number } | null => {
    const e: Record<string, string> = {};
    if (!form.model.trim()) e.model = t.tractor.required;
    if (!form.serialNumber.trim()) e.serialNumber = t.tractor.required;
    if (!form.location.trim()) e.location = t.tractor.required;
    if (!form.operatorName.trim()) e.operatorName = t.tractor.required;
    if (!isIsoDate(form.registrationDate.trim())) e.registrationDate = t.tractor.badDate;
    const reading = parseDecimal(form.initialReading);
    if (reading === null || reading < 0) e.initialReading = t.tractor.badNumber;
    setErrors(e);
    return Object.keys(e).length === 0 && reading !== null ? { initialReading: reading } : null;
  };

  const handleSubmit = async () => {
    const ok = validate();
    if (!ok) return;
    setLoading(true);
    try {
      await registerTractor({
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        registrationDate: form.registrationDate.trim(),
        location: form.location.trim(),
        operatorName: form.operatorName.trim(),
        photoUri,
        initialReading: ok.initialReading,
      });
      router.back();
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message || t.errors.storage);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, extra?: object) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] ? styles.inputError : null]}
        value={form[key]}
        onChangeText={set(key)}
        {...extra}
      />
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.tractor.addTitle}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t.tractor.photo}</Text>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={() => pick(false)}>
                <Text style={styles.photoButtonText}>{t.tractor.pickPhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => pick(true)}>
                <Text style={styles.photoButtonText}>{t.tractor.takePhoto}</Text>
              </TouchableOpacity>
              {photoUri ? (
                <TouchableOpacity style={styles.photoButton} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.photoButtonText}>{t.tractor.removePhoto}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {field('model', t.tractor.model)}
          {field('serialNumber', t.tractor.serial)}
          {field('location', t.tractor.location)}
          {field('operatorName', t.tractor.operator)}
          {field('registrationDate', t.tractor.regDate)}
          {field('initialReading', t.tractor.initialReading, { keyboardType: 'decimal-pad' })}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>{t.tractor.register}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  photoSection: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  photoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  forbidden: { padding: 24, fontSize: 16, color: '#6b7280', textAlign: 'center' },
  photoButton: {
    flex: 1,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  dateInputContainer: {
    position: 'relative',
  },
  dateInput: {
    paddingRight: 40,
  },
  calendarIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
