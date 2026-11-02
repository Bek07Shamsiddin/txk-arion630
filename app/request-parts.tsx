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
import { ArrowLeft, ChevronDown, Package } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Tractor, PartsUrgency } from '@/lib/types';

export default function RequestPartsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [showTractorPicker, setShowTractorPicker] = useState(false);

  const [formData, setFormData] = useState({
    tractorId: '',
    tractorModel: '',
    partName: '',
    quantity: '1',
    urgency: 'normal' as PartsUrgency,
    requestedBy: '',
    notes: '',
  });

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

    if (!formData.partName.trim()) {
      newErrors.partName = 'Part name is required';
    }

    const quantity = Number(formData.quantity);
    if (!formData.quantity.trim() || isNaN(quantity) || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    if (!formData.requestedBy.trim()) {
      newErrors.requestedBy = 'Your name is required';
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
      const { error } = await supabase.from('parts_requests').insert([
        {
          tractor_id: formData.tractorId,
          part_name: formData.partName.trim(),
          quantity: Number(formData.quantity),
          urgency: formData.urgency,
          requested_by: formData.requestedBy.trim(),
          notes: formData.notes.trim() || null,
          request_date: new Date().toISOString(),
          delivery_status: 'pending',
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Parts request submitted successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting parts request:', error);
      Alert.alert('Error', error.message || 'Failed to submit parts request');
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
          <Text style={styles.title}>Request Parts</Text>
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
        <Text style={styles.title}>Request Parts</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Package size={24} color="#3b82f6" />
          <Text style={styles.infoText}>
            Submit parts requests for tractor maintenance and repairs. Admin will process and
            update delivery status.
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
            <Text style={styles.label}>Part Name *</Text>
            <TextInput
              style={[styles.input, errors.partName && styles.inputError]}
              placeholder="e.g., Oil Filter, Brake Pad, Hydraulic Hose"
              value={formData.partName}
              onChangeText={(text) => {
                setFormData({ ...formData, partName: text });
                if (errors.partName) setErrors({ ...errors, partName: '' });
              }}
            />
            {errors.partName && <Text style={styles.errorText}>{errors.partName}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="1"
              value={formData.quantity}
              onChangeText={(text) => {
                setFormData({ ...formData, quantity: text });
                if (errors.quantity) setErrors({ ...errors, quantity: '' });
              }}
              keyboardType="number-pad"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Urgency *</Text>
            <View style={styles.urgencyButtons}>
              {(['urgent', 'medium', 'normal'] as PartsUrgency[]).map((urgency) => (
                <TouchableOpacity
                  key={urgency}
                  style={[
                    styles.urgencyButton,
                    formData.urgency === urgency && styles.urgencyButtonActive,
                    urgency === 'urgent' && formData.urgency === urgency && styles.urgentActive,
                  ]}
                  onPress={() => setFormData({ ...formData, urgency })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.urgencyButtonText,
                      formData.urgency === urgency && styles.urgencyButtonTextActive,
                    ]}
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Requested By *</Text>
            <TextInput
              style={[styles.input, errors.requestedBy && styles.inputError]}
              placeholder="Your name"
              value={formData.requestedBy}
              onChangeText={(text) => {
                setFormData({ ...formData, requestedBy: text });
                if (errors.requestedBy) setErrors({ ...errors, requestedBy: '' });
              }}
            />
            {errors.requestedBy && <Text style={styles.errorText}>{errors.requestedBy}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional specifications, part numbers, or notes..."
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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
            <Text style={styles.submitButtonText}>Submit Request</Text>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
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
  urgencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  urgencyButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  urgentActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  urgencyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  urgencyButtonTextActive: {
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
