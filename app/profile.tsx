import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Save, Lock, User as UserIcon, Phone, Shield, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadMedia } from '@/lib/mediaUpload';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { formatDate, getCurrentTimestamp } from '@/lib/timezone';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        Alert.alert('Error', 'No user found. Please log in.');
        return;
      }

      setEmail(user.email || '');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name,
          phone: data.phone,
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          updated_at: getCurrentTimestamp(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      await loadProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to:\n${email}\n\nDo you want to continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            try {
              setResettingPassword(true);

              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
              });

              if (error) throw error;

              Alert.alert(
                'Email Sent',
                'A password reset link has been sent to your email. Please check your inbox and follow the instructions.'
              );
            } catch (error: any) {
              console.error('Error resetting password:', error);
              Alert.alert('Error', error.message || 'Failed to send password reset email');
            } finally {
              setResettingPassword(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
              router.replace('/select-user');
            } catch (error: any) {
              console.error('Error signing out:', error);
              Alert.alert('Error', error.message || 'Failed to sign out');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const validatePhotoFile = (asset: any): { valid: boolean; error?: string } => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    if (asset.uri) {
      const extension = asset.uri.split('.').pop()?.toLowerCase();
      if (extension && !['jpg', 'jpeg', 'png'].includes(extension)) {
        return { valid: false, error: 'Only JPG and PNG formats are supported' };
      }
    }

    return { valid: true };
  };

  const handlePhotoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error: any) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', error.message || 'Failed to select photo');
    }
  };

  const handlePhotoFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const uploadPhoto = async (asset: any) => {
    try {
      const validation = validatePhotoFile(asset);
      if (!validation.valid) {
        Alert.alert('Invalid File', validation.error || 'Invalid file');
        return;
      }

      setUploadingPhoto(true);
      setUploadProgress(10);

      setUploadProgress(30);
      const photoUrl = await uploadMedia(asset.uri, 'profile-photos');
      setUploadProgress(70);

      const { error } = await supabase
        .from('users')
        .update({
          profile_photo_url: photoUrl,
          updated_at: getCurrentTimestamp(),
        })
        .eq('id', profile!.id);

      if (error) throw error;

      setUploadProgress(90);
      await loadProfile();
      setUploadProgress(100);
      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      'Choose Photo Source',
      'Select where you want to get your photo from',
      [
        {
          text: 'Camera',
          onPress: handlePhotoFromCamera,
        },
        {
          text: 'Gallery',
          onPress: handlePhotoFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'technician':
        return '#3b82f6';
      case 'operator':
        return '#10b981';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Full access to all features and settings';
      case 'technician':
        return 'Can manage service records, parts, and mechanic requests';
      case 'operator':
        return 'Can view tractors, report issues, and submit requests';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
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
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profile.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <UserIcon size={48} color="#9ca3af" />
              </View>
            )}
            {uploadingPhoto && (
              <View style={styles.photoOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
                {uploadProgress > 0 && (
                  <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePhotoUpload}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            <Camera size={16} color="#ffffff" />
            <Text style={styles.photoButtonText}>
              {profile.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Shield size={20} color={getRoleColor(profile.role)} />
            <Text style={[styles.roleTitle, { color: getRoleColor(profile.role) }]}>
              {getRoleLabel(profile.role)}
            </Text>
          </View>
          <Text style={styles.roleDescription}>{getRoleDescription(profile.role)}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <View style={styles.inputContainer}>
              <UserIcon size={18} color="#9ca3af" />
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Your name"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone *</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color="#9ca3af" />
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="+1234567890"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email (Login)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.emailText}>{email}</Text>
            </View>
            <Text style={styles.helperText}>Contact your administrator to change your email</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.roleText}>{getRoleLabel(profile.role)}</Text>
            </View>
            <Text style={styles.helperText}>Contact your administrator to change your role</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={[styles.securityButton, resettingPassword && styles.securityButtonDisabled]}
            onPress={handlePasswordReset}
            disabled={resettingPassword}
            activeOpacity={0.7}
          >
            {resettingPassword ? (
              <ActivityIndicator size="small" color="#1f2937" />
            ) : (
              <>
                <Lock size={20} color="#1f2937" />
                <Text style={styles.securityButtonText}>Reset Password</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signOutButton, signingOut && styles.securityButtonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.7}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <LogOut size={20} color="#ffffff" />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {formatDate(profile.created_at)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 20,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  roleCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  emailText: {
    fontSize: 16,
    color: '#6b7280',
    paddingVertical: 12,
  },
  roleText: {
    fontSize: 16,
    color: '#6b7280',
    paddingVertical: 12,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#10b981',
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  securitySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  securityButtonDisabled: {
    opacity: 0.6,
  },
  securityButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    marginTop: 12,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoSection: {
    padding: 16,
    marginBottom: 32,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
});
