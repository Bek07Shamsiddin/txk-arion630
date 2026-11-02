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
import { ArrowLeft, Wrench, ChevronDown, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Tractor } from '@/lib/types';

export default function RequestMechanicScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [showTractorPicker, setShowTractorPicker] = useState(false);

  const [formData, setFormData] = useState({
    tractorId: '',
    tractorModel: '',
    operatorName: '',
    problemDescription: '',
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

    if (!formData.operatorName.trim()) {
      newErrors.operatorName = 'Your name is required';
    }

    if (!formData.problemDescription.trim()) {
      newErrors.problemDescription = 'Problem description is required';
    } else if (formData.problemDescription.trim().length < 10) {
      newErrors.problemDescription = 'Please provide more details (at least 10 characters)';
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
      const { error } = await supabase.from('mechanic_requests').insert([
        {
          tractor_id: formData.tractorId,
          operator_name: formData.operatorName.trim(),
          problem_description: formData.problemDescription.trim(),
          request_date: new Date().toISOString(),
          status: 'pending',
        },
      ]);

      if (error) throw error;

      Alert.alert(
        'Request Submitted',
        'Your mechanic request has been submitted. A technician will be notified and will contact you soon.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting mechanic request:', error);
      Alert.alert('Error', error.message || 'Failed to submit request');
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
          <Text style={styles.title}>Request Mechanic</Text>
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
        <Text style={styles.title}>Request Mechanic</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Wrench size={24} color="#ef4444" />
          <Text style={styles.infoText}>
            Need a mechanic? Describe the problem and a technician will be notified immediately to
            assist you.
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
                          {tractor.serial_number} • {tractor.location}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              tractor.status === 'active'
                                ? '#10b981'
                                : tractor.status === 'maintenance'
                                ? '#f59e0b'
                                : '#ef4444',
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={[styles.input, errors.operatorName && styles.inputError]}
              placeholder="Enter your name"
              value={formData.operatorName}
              onChangeText={(text) => {
                setFormData({ ...formData, operatorName: text });
                if (errors.operatorName) setErrors({ ...errors, operatorName: '' });
              }}
            />
            {errors.operatorName && <Text style={styles.errorText}>{errors.operatorName}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Problem Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.problemDescription && styles.inputError]}
              placeholder="Describe the problem in detail... What happened? What symptoms are you experiencing? When did it start?"
              value={formData.problemDescription}
              onChangeText={(text) => {
                setFormData({ ...formData, problemDescription: text });
                if (errors.problemDescription)
                  setErrors({ ...errors, problemDescription: '' });
              }}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.problemDescription && (
              <Text style={styles.errorText}>{errors.problemDescription}</Text>
            )}
            <Text style={styles.helperText}>
              Please provide as much detail as possible to help the technician prepare
            </Text>
          </View>

          <View style={styles.infoBox}>
            <AlertCircle size={20} color="#3b82f6" />
            <View style={styles.infoBoxContent}>
              <Text style={styles.infoBoxTitle}>What happens next?</Text>
              <Text style={styles.infoBoxText}>
                1. Your request will be sent immediately{'\n'}
                2. All technicians will be notified{'\n'}
                3. A technician will contact you soon{'\n'}
                4. You can track the status of your request
              </Text>
            </View>
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
            <>
              <Wrench size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </>
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
    backgroundColor: '#fef2f2',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  infoText: {
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
    minHeight: 120,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  helperText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    marginTop: 8,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    gap: 8,
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
