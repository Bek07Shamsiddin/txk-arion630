import { useState, useEffect } from 'react';
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
import { ArrowLeft, ChevronDown, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Tractor } from '@/lib/types';
import { MediaUploader } from '@/components/MediaUploader';
import { MediaItem, uploadMultipleMedia } from '@/lib/mediaUpload';

export default function ReportDamageScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [showTractorPicker, setShowTractorPicker] = useState(false);

  const [formData, setFormData] = useState({
    tractorId: '',
    tractorModel: '',
    damageType: '',
    description: '',
    location: '',
    severity: 'medium',
  });

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTractors();
  }, []);

  const loadTractors = async () => {
    try {
      const { data, error } = await supabase
        .from('tractors')
        .select('*')
        .order('model');

      if (error) throw error;
      setTractors(data || []);
    } catch (error) {
      console.error('Error loading tractors:', error);
      Alert.alert('Error', 'Failed to load tractors');
    } finally {
      setLoadingTractors(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tractorId) {
      newErrors.tractorId = 'Please select a tractor';
    }

    if (!formData.damageType.trim()) {
      newErrors.damageType = 'Damage type is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (media.length === 0) {
      newErrors.media = 'Please add at least one photo or video of the damage';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectTractor = (tractor: Tractor) => {
    setFormData({
      ...formData,
      tractorId: tractor.id,
      tractorModel: `${tractor.model} (${tractor.serial_number})`,
    });
    setShowTractorPicker(false);
    if (errors.tractorId) setErrors({ ...errors, tractorId: '' });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const mediaUrls = await uploadMultipleMedia(media, 'damage');

      if (mediaUrls.length === 0) {
        Alert.alert('Upload Failed', 'Failed to upload media. Please try again.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('damage_reports').insert([
        {
          tractor_id: formData.tractorId,
          damage_type: formData.damageType.trim(),
          description: formData.description.trim(),
          location: formData.location.trim() || null,
          severity: formData.severity,
          media_urls: mediaUrls,
          reported_at: new Date().toISOString(),
          status: 'reported',
        },
      ]);

      if (error) throw error;

      const selectedTractor = tractors.find(t => t.id === formData.tractorId);
      if (selectedTractor && selectedTractor.status !== 'maintenance') {
        await supabase
          .from('tractors')
          .update({ status: 'maintenance' })
          .eq('id', formData.tractorId);
      }

      Alert.alert('Success', 'Damage report submitted successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting damage report:', error);
      Alert.alert('Error', error.message || 'Failed to submit damage report');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTractors) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Report Damage</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Report Damage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBanner}>
          <AlertTriangle size={24} color="#ef4444" />
          <Text style={styles.warningText}>
            Document all damage with photos/videos for insurance and maintenance records
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Tractor *</Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.tractorId && styles.inputError]}
              onPress={() => setShowTractorPicker(!showTractorPicker)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !formData.tractorModel && styles.pickerPlaceholder,
                ]}
              >
                {formData.tractorModel || 'Choose a tractor'}
              </Text>
              <ChevronDown size={20} color="#6b7280" />
            </TouchableOpacity>
            {errors.tractorId && <Text style={styles.errorText}>{errors.tractorId}</Text>}

            {showTractorPicker && (
              <View style={styles.pickerContainer}>
                {tractors.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>No tractors found</Text>
                  </View>
                ) : (
                  tractors.map((tractor) => (
                    <TouchableOpacity
                      key={tractor.id}
                      style={styles.pickerItem}
                      onPress={() => selectTractor(tractor)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.pickerItemTitle}>{tractor.model}</Text>
                        <Text style={styles.pickerItemSubtitle}>
                          {tractor.serial_number} • {tractor.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Damage Type *</Text>
            <TextInput
              style={[styles.input, errors.damageType && styles.inputError]}
              placeholder="e.g., Mechanical Failure, Collision, Wear & Tear"
              value={formData.damageType}
              onChangeText={(text) => {
                setFormData({ ...formData, damageType: text });
                if (errors.damageType) setErrors({ ...errors, damageType: '' });
              }}
            />
            {errors.damageType && (
              <Text style={styles.errorText}>{errors.damageType}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Severity *</Text>
            <View style={styles.severityButtons}>
              {['low', 'medium', 'high', 'critical'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.severityButton,
                    formData.severity === severity && styles.severityButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, severity })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.severityButtonText,
                      formData.severity === severity && styles.severityButtonTextActive,
                    ]}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Front left tire, Engine compartment"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe the damage in detail..."
              value={formData.description}
              onChangeText={(text) => {
                setFormData({ ...formData, description: text });
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          <MediaUploader
            media={media}
            onMediaChange={(newMedia) => {
              setMedia(newMedia);
              if (errors.media) setErrors({ ...errors, media: '' });
            }}
            maxItems={15}
            allowVideo={true}
            label="Damage Documentation (Photos & Videos) *"
            description="Upload clear photos and videos showing all damage. Multiple angles recommended."
            folder="damage"
          />
          {errors.media && <Text style={styles.errorText}>{errors.media}</Text>}
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
            <Text style={styles.submitButtonText}>Submit Damage Report</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  pickerPlaceholder: {
    color: '#9ca3af',
  },
  pickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 250,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  pickerItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  pickerEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  severityButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  severityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  severityButtonTextActive: {
    color: '#ffffff',
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
