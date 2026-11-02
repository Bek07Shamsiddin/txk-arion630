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
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Tractor } from '@/lib/types';
import { getCurrentDate } from '@/lib/timezone';

interface PartInput {
  id: string;
  name: string;
  quantity: string;
}

export default function AddServiceRecordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [showTractorPicker, setShowTractorPicker] = useState(false);

  const [formData, setFormData] = useState({
    tractorId: '',
    tractorModel: '',
    serviceType: '',
    motoHour: '',
    date: getCurrentDate(),
    technicianNote: '',
  });

  const [parts, setParts] = useState<PartInput[]>([
    { id: '1', name: '', quantity: '' },
  ]);

  const [photos, setPhotos] = useState<string[]>([]);
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

    if (!formData.serviceType.trim()) {
      newErrors.serviceType = 'Service type is required';
    }

    if (!formData.motoHour.trim()) {
      newErrors.motoHour = 'Moto-hour value is required';
    } else {
      const value = formData.motoHour.trim();
      const numValue = Number(value);

      if (value === '' || isNaN(numValue) || !isFinite(numValue) || numValue < 0) {
        newErrors.motoHour = 'Must be a valid number';
      }
    }

    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const dateValue = formData.date.trim();

      if (!dateRegex.test(dateValue)) {
        newErrors.date = 'Date must be in YYYY-MM-DD format';
      } else {
        const testDate = new Date(dateValue);
        if (isNaN(testDate.getTime())) {
          newErrors.date = 'Invalid date value';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectTractor = (tractor: Tractor) => {
    setFormData({
      ...formData,
      tractorId: tractor.id,
      tractorModel: `${tractor.model} (${tractor.serial_number})`,
      motoHour: tractor.current_moto_hours.toString(),
    });
    setShowTractorPicker(false);
    if (errors.tractorId) setErrors({ ...errors, tractorId: '' });
  };

  const addPart = () => {
    setParts([...parts, { id: Date.now().toString(), name: '', quantity: '' }]);
  };

  const removePart = (id: string) => {
    if (parts.length > 1) {
      setParts(parts.filter((part) => part.id !== id));
    }
  };

  const updatePart = (id: string, field: 'name' | 'quantity', value: string) => {
    setParts(
      parts.map((part) => (part.id === id ? { ...part, [field]: value } : part))
    );
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Image upload is not available on web platform');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are needed to upload photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera is not available on web platform');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permissions are needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileName = `service-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `service-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('photos').getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const motoHourStr = formData.motoHour.trim();
      const motoHourValue = Number(motoHourStr);

      if (!motoHourStr || isNaN(motoHourValue) || !isFinite(motoHourValue) || motoHourValue < 0) {
        Alert.alert('Validation Error', 'Invalid moto-hour value. Please enter a valid number.');
        setLoading(false);
        return;
      }

      const dateValue = formData.date.trim();
      if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        Alert.alert('Validation Error', 'Invalid date format. Please use YYYY-MM-DD format.');
        setLoading(false);
        return;
      }

      const testDate = new Date(dateValue);
      if (isNaN(testDate.getTime())) {
        Alert.alert('Validation Error', 'Invalid date value. Please enter a valid date.');
        setLoading(false);
        return;
      }

      const photoUrls: string[] = [];

      if (photos.length > 0 && Platform.OS !== 'web') {
        for (const photoUri of photos) {
          const url = await uploadPhoto(photoUri);
          if (url) {
            photoUrls.push(url);
          }
        }
      }

      const usedParts = parts
        .filter((part) => part.name.trim())
        .map((part) => ({
          name: part.name.trim(),
          quantity: part.quantity.trim() ? parseInt(part.quantity) : 1,
        }));

      const { error } = await supabase.from('service_logs').insert([
        {
          tractor_id: formData.tractorId,
          service_type: formData.serviceType.trim(),
          moto_hour: motoHourValue,
          date: dateValue,
          used_parts: usedParts,
          technician_note: formData.technicianNote.trim() || null,
          uploaded_photos: photoUrls,
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Service record added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving service record:', error);
      Alert.alert('Error', error.message || 'Failed to save service record');
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
          <Text style={styles.title}>Add Service Record</Text>
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
        <Text style={styles.title}>Add Service Record</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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
                          {tractor.serial_number} • Current: {tractor.current_moto_hours}h
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Type *</Text>
            <TextInput
              style={[styles.input, errors.serviceType && styles.inputError]}
              placeholder="e.g., Oil Change, Filter Replacement"
              value={formData.serviceType}
              onChangeText={(text) => {
                setFormData({ ...formData, serviceType: text });
                if (errors.serviceType) setErrors({ ...errors, serviceType: '' });
              }}
            />
            {errors.serviceType && (
              <Text style={styles.errorText}>{errors.serviceType}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Moto-Hour at Service *</Text>
            <TextInput
              style={[styles.input, errors.motoHour && styles.inputError]}
              placeholder="e.g., 250"
              value={formData.motoHour}
              onChangeText={(text) => {
                setFormData({ ...formData, motoHour: text });
                if (errors.motoHour) setErrors({ ...errors, motoHour: '' });
              }}
              keyboardType="numeric"
            />
            {errors.motoHour && <Text style={styles.errorText}>{errors.motoHour}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Date *</Text>
            <TextInput
              style={[styles.input, errors.date && styles.inputError]}
              placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
              value={formData.date}
              onChangeText={(text) => {
                setFormData({ ...formData, date: text });
                if (errors.date) setErrors({ ...errors, date: '' });
              }}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Used Parts</Text>
              <TouchableOpacity onPress={addPart} style={styles.addPartButton}>
                <Text style={styles.addPartText}>+ Add Part</Text>
              </TouchableOpacity>
            </View>
            {parts.map((part, index) => (
              <View key={part.id} style={styles.partRow}>
                <TextInput
                  style={[styles.input, styles.partNameInput]}
                  placeholder="Part name"
                  value={part.name}
                  onChangeText={(text) => updatePart(part.id, 'name', text)}
                />
                <TextInput
                  style={[styles.input, styles.partQuantityInput]}
                  placeholder="Qty"
                  value={part.quantity}
                  onChangeText={(text) => updatePart(part.id, 'quantity', text)}
                  keyboardType="numeric"
                />
                {parts.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removePart(part.id)}
                    style={styles.removePartButton}
                  >
                    <X size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Technician Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any relevant notes about the service performed"
              value={formData.technicianNote}
              onChangeText={(text) =>
                setFormData({ ...formData, technicianNote: text })
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Photos (Optional)</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <Text style={styles.photoButtonText}>Choose Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <Camera size={16} color="#ffffff" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {photos.length > 0 && (
              <View style={styles.photoPreviewContainer}>
                {photos.map((uri, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri }} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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
            <Text style={styles.submitButtonText}>Save Service Record</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addPartButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addPartText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partNameInput: {
    flex: 2,
  },
  partQuantityInput: {
    flex: 1,
  },
  removePartButton: {
    padding: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoPreview: {
    position: 'relative',
  },
  photoPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
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
