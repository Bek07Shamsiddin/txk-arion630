import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { MediaUploader } from '@/components/MediaUploader';
import { MediaItem, uploadMultipleMedia } from '@/lib/mediaUpload';

export default function AddTractorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    model: '',
    serialNumber: '',
    registrationDate: '',
    initialMotoHours: '',
    location: '',
  });

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Serial number is required';
    }

    if (!formData.registrationDate.trim()) {
      newErrors.registrationDate = 'Registration date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.registrationDate)) {
        newErrors.registrationDate = 'Date must be in YYYY-MM-DD format';
      }
    }

    if (!formData.initialMotoHours.trim()) {
      newErrors.initialMotoHours = 'Initial moto-hours is required';
    } else if (isNaN(Number(formData.initialMotoHours)) || Number(formData.initialMotoHours) < 0) {
      newErrors.initialMotoHours = 'Must be a valid number';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateNextServiceHours = (currentHours: number): number => {
    const intervals = [50, 100, 250, 500, 1000];

    for (const interval of intervals) {
      if (currentHours < interval) {
        return interval;
      }
    }

    const multiplier = Math.floor(currentHours / 1000) + 1;
    return multiplier * 1000;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const mediaUrls = await uploadMultipleMedia(media, 'tractors');
      const photoUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;

      const initialHours = Number(formData.initialMotoHours);
      const nextServiceHours = calculateNextServiceHours(initialHours);

      const { data, error } = await supabase
        .from('tractors')
        .insert([
          {
            model: formData.model.trim(),
            serial_number: formData.serialNumber.trim(),
            registration_date: formData.registrationDate.trim(),
            current_moto_hours: initialHours,
            next_service_hours: nextServiceHours,
            location: formData.location.trim(),
            photo_url: photoUrl,
            media_urls: mediaUrls,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        `Tractor registered successfully!\nNext service at: ${nextServiceHours} hours`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving tractor:', error);
      Alert.alert('Error', error.message || 'Failed to register tractor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Tractor</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <MediaUploader
            media={media}
            onMediaChange={setMedia}
            maxItems={5}
            allowVideo={true}
            label="Tractor Condition (Photos & Videos)"
            description="Document the current condition of the tractor with photos and videos"
            folder="tractors"
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={[styles.input, errors.model && styles.inputError]}
              placeholder="e.g., John Deere 7230R"
              value={formData.model}
              onChangeText={(text) => {
                setFormData({ ...formData, model: text });
                if (errors.model) setErrors({ ...errors, model: '' });
              }}
            />
            {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Serial Number *</Text>
            <TextInput
              style={[styles.input, errors.serialNumber && styles.inputError]}
              placeholder="e.g., 1RW7230RHEB123456"
              value={formData.serialNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, serialNumber: text });
                if (errors.serialNumber) setErrors({ ...errors, serialNumber: '' });
              }}
            />
            {errors.serialNumber && (
              <Text style={styles.errorText}>{errors.serialNumber}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Registration Date *</Text>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={[styles.input, styles.dateInput, errors.registrationDate && styles.inputError]}
                placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                value={formData.registrationDate}
                onChangeText={(text) => {
                  setFormData({ ...formData, registrationDate: text });
                  if (errors.registrationDate) setErrors({ ...errors, registrationDate: '' });
                }}
              />
              <Calendar size={20} color="#6b7280" style={styles.calendarIcon} />
            </View>
            {errors.registrationDate && (
              <Text style={styles.errorText}>{errors.registrationDate}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Moto-Hours *</Text>
            <TextInput
              style={[styles.input, errors.initialMotoHours && styles.inputError]}
              placeholder="e.g., 0"
              value={formData.initialMotoHours}
              onChangeText={(text) => {
                setFormData({ ...formData, initialMotoHours: text });
                if (errors.initialMotoHours) setErrors({ ...errors, initialMotoHours: '' });
              }}
              keyboardType="numeric"
            />
            {errors.initialMotoHours && (
              <Text style={styles.errorText}>{errors.initialMotoHours}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={[styles.input, errors.location && styles.inputError]}
              placeholder="e.g., Field A, Sector 3"
              value={formData.location}
              onChangeText={(text) => {
                setFormData({ ...formData, location: text });
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              The next service interval will be automatically calculated based on standard
              intervals: 50, 100, 250, 500, 1000 hours
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Register Tractor</Text>
          )}
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
    marginTop: 12,
    gap: 12,
  },
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
