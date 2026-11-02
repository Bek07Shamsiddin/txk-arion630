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
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Tractor } from '@/lib/types';
import { getTriggeredIntervals } from '@/lib/notifications';
import { getCurrentDate, getCurrentTimestamp } from '@/lib/timezone';

export default function AddMotoHoursScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [loadingTractors, setLoadingTractors] = useState(true);
  const [showTractorPicker, setShowTractorPicker] = useState(false);

  const [formData, setFormData] = useState({
    tractorId: '',
    tractorModel: '',
    motoHourValue: '',
    operatorNote: '',
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
        .eq('status', 'active')
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

    if (!formData.motoHourValue.trim()) {
      newErrors.motoHourValue = 'Moto-hour value is required';
    } else {
      const value = formData.motoHourValue.trim();
      const numValue = Number(value);

      if (value === '' || isNaN(numValue) || !isFinite(numValue) || numValue <= 0) {
        newErrors.motoHourValue = 'Must be a valid positive number';
      } else if (numValue > 1000) {
        newErrors.motoHourValue = 'Value seems too high. Please enter hours worked today (max 1000)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkAndCreateServiceReminder = async (
    tractorId: string,
    newMotoHours: number,
    previousMotoHours: number
  ) => {
    const triggeredIntervals = getTriggeredIntervals(previousMotoHours, newMotoHours);

    if (triggeredIntervals.length === 0) {
      return;
    }

    const notifications = triggeredIntervals.map((interval) => ({
      tractor_id: tractorId,
      notification_type: interval.title,
      message: interval.message,
      triggered_at_hours: newMotoHours,
      is_read: false,
    }));

    const { error } = await supabase.from('service_notifications').insert(notifications);

    if (error) {
      console.error('Error creating service notifications:', error);
    }
  };

  const updateNextServiceInterval = (currentHours: number): number => {
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
      const selectedTractor = tractors.find((t) => t.id === formData.tractorId);
      if (!selectedTractor) {
        throw new Error('Selected tractor not found');
      }

      const motoHourValueStr = formData.motoHourValue.trim();
      const newMotoHourValue = Number(motoHourValueStr);

      if (!motoHourValueStr || isNaN(newMotoHourValue) || !isFinite(newMotoHourValue) || newMotoHourValue <= 0) {
        Alert.alert('Validation Error', 'Invalid moto-hour value. Please enter a valid positive number.');
        setLoading(false);
        return;
      }

      const previousMotoHours = selectedTractor.current_moto_hours;

      let currentDate: string;
      try {
        currentDate = getCurrentDate();
      } catch (dateError: any) {
        console.error('Date generation error:', dateError);
        Alert.alert('Error', 'Failed to get current date. Please try again.');
        setLoading(false);
        return;
      }

      if (!currentDate || !/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
        Alert.alert('Error', 'Invalid date format. Please try again.');
        setLoading(false);
        return;
      }

      const { error: motoHourError } = await supabase.from('moto_hours').insert([
        {
          tractor_id: formData.tractorId,
          value: newMotoHourValue,
          date: currentDate,
          operator_note: formData.operatorNote.trim() || null,
        },
      ]);

      if (motoHourError) throw motoHourError;

      const newTotalHours = previousMotoHours + newMotoHourValue;
      const nextServiceHours = updateNextServiceInterval(newTotalHours);

      const { error: updateError } = await supabase
        .from('tractors')
        .update({
          current_moto_hours: newTotalHours,
          next_service_hours: nextServiceHours,
          updated_at: getCurrentTimestamp(),
        })
        .eq('id', formData.tractorId);

      if (updateError) throw updateError;

      await checkAndCreateServiceReminder(
        formData.tractorId,
        newTotalHours,
        previousMotoHours
      );

      Alert.alert(
        'Success',
        `Moto-hours logged successfully!\nTotal hours: ${newTotalHours}\nNext service at: ${nextServiceHours}h`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving moto-hours:', error);
      Alert.alert('Error', error.message || 'Failed to log moto-hours');
    } finally {
      setLoading(false);
    }
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

  if (loadingTractors) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Log Moto-Hours</Text>
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
        <Text style={styles.title}>Log Moto-Hours</Text>
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
                    <Text style={styles.pickerEmptyText}>No active tractors found</Text>
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
            <Text style={styles.label}>Moto-Hour Value *</Text>
            <TextInput
              style={[styles.input, errors.motoHourValue && styles.inputError]}
              placeholder="e.g., 8"
              value={formData.motoHourValue}
              onChangeText={(text) => {
                setFormData({ ...formData, motoHourValue: text });
                if (errors.motoHourValue) setErrors({ ...errors, motoHourValue: '' });
              }}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Enter the number of hours worked today
            </Text>
            {errors.motoHourValue && (
              <Text style={styles.errorText}>{errors.motoHourValue}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Operator Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Field work 8 hours"
              value={formData.operatorNote}
              onChangeText={(text) => setFormData({ ...formData, operatorNote: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.helpText}>
              Add any relevant notes about today's work
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Service Intervals</Text>
            <Text style={styles.infoText}>
              Automatic reminders will be created when reaching: 50, 100, 250, 500, 1000 hours
              and every 1000 hours thereafter.
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
            <Text style={styles.submitButtonText}>Log Moto-Hours</Text>
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
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
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
