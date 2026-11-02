import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, Image as ImageIcon, Video, X, Play, Upload, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export interface MediaItem {
  uri: string;
  type: 'photo' | 'video';
  uploaded?: boolean;
  publicUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadProgress?: number;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxItems?: number;
  allowVideo?: boolean;
  label?: string;
  description?: string;
  folder?: 'tractors' | 'service' | 'damage';
}

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png'];
const ALLOWED_VIDEO_TYPES = ['mp4', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function MediaUploader({
  media,
  onMediaChange,
  maxItems = 10,
  allowVideo = true,
  label = 'Photos & Videos',
  description = 'Upload photos and videos to document condition',
  folder = 'service',
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFileType = (uri: string, type: 'photo' | 'video'): boolean => {
    const extension = uri.split('.').pop()?.toLowerCase() || '';

    if (type === 'photo') {
      return ALLOWED_IMAGE_TYPES.includes(extension);
    } else {
      return ALLOWED_VIDEO_TYPES.includes(extension);
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return uri;
    }

    try {
      const manipResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!manipResult.canceled && manipResult.assets[0]) {
        return manipResult.assets[0].uri;
      }
    } catch (error) {
      console.log('Compression not available, using original');
    }

    return uri;
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'web') {
      return true;
    }

    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

    return cameraStatus.granted && mediaStatus.granted;
  };

  const addMedia = (newItem: MediaItem) => {
    if (media.length >= maxItems) {
      Alert.alert('Limit Reached', `You can upload up to ${maxItems} items`);
      return;
    }

    if (!validateFileType(newItem.uri, newItem.type)) {
      const allowedTypes = newItem.type === 'photo'
        ? ALLOWED_IMAGE_TYPES.join(', ')
        : ALLOWED_VIDEO_TYPES.join(', ');
      Alert.alert('Invalid File Type', `Please upload ${newItem.type}s in format: ${allowedTypes}`);
      return;
    }

    onMediaChange([...media, newItem]);
  };

  const pickMedia = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Media upload is not available on web platform. Use the mobile app for full functionality.');
      return;
    }

    if (media.length >= maxItems) {
      Alert.alert('Limit Reached', `You can upload up to ${maxItems} items`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Camera and media library permissions are needed to upload files'
      );
      return;
    }

    const mediaTypes = allowVideo
      ? ImagePicker.MediaTypeOptions.All
      : ImagePicker.MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newMedia: MediaItem = {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'photo',
        uploaded: false,
        fileName: asset.fileName || `${folder}-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        fileSize: asset.fileSize,
      };

      addMedia(newMedia);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera is not available on web platform');
      return;
    }

    if (media.length >= maxItems) {
      Alert.alert('Limit Reached', `You can upload up to ${maxItems} items`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permissions are needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newMedia: MediaItem = {
        uri: result.assets[0].uri,
        type: 'photo',
        uploaded: false,
        fileName: `photo-${Date.now()}.jpg`,
      };

      addMedia(newMedia);
    }
  };

  const recordVideo = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Video recording is not available on web platform');
      return;
    }

    if (!allowVideo) {
      return;
    }

    if (media.length >= maxItems) {
      Alert.alert('Limit Reached', `You can upload up to ${maxItems} items`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permissions are needed to record videos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const newMedia: MediaItem = {
        uri: result.assets[0].uri,
        type: 'video',
        uploaded: false,
        fileName: `video-${Date.now()}.mp4`,
      };

      addMedia(newMedia);
    }
  };

  const removeMedia = (index: number) => {
    Alert.alert('Remove Media', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onMediaChange(media.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const uploadMedia = async (item: MediaItem, index: number): Promise<string | null> => {
    try {
      const response = await fetch(item.uri);
      const blob = await response.blob();

      if (blob.size > MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Please upload files smaller than 50MB');
        return null;
      }

      const fileExtension = item.type === 'video' ? 'mp4' : 'jpg';
      const fileName = item.fileName || `${item.type}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, {
          contentType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('photos').getPublicUrl(filePath);

      const updatedMedia = [...media];
      updatedMedia[index] = {
        ...item,
        uploaded: true,
        publicUrl: data.publicUrl,
      };
      onMediaChange(updatedMedia);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  };

  const uploadAllMedia = async (): Promise<string[]> => {
    if (Platform.OS === 'web') {
      return [];
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    const totalItems = media.filter(item => !item.uploaded).length;

    try {
      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        if (!item.uploaded) {
          setUploadProgress(Math.round(((uploadedUrls.length + 1) / totalItems) * 100));
          const url = await uploadMedia(item, i);
          if (url) {
            uploadedUrls.push(url);
          }
        } else if (item.publicUrl) {
          uploadedUrls.push(item.publicUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }

    return uploadedUrls;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.counter}>
          {media.length}/{maxItems}
        </Text>
      </View>

      {description && <Text style={styles.description}>{description}</Text>}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, (uploading || media.length >= maxItems) && styles.buttonDisabled]}
          onPress={takePhoto}
          activeOpacity={0.7}
          disabled={uploading || media.length >= maxItems}
        >
          <Camera size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Photo</Text>
        </TouchableOpacity>

        {allowVideo && (
          <TouchableOpacity
            style={[styles.button, (uploading || media.length >= maxItems) && styles.buttonDisabled]}
            onPress={recordVideo}
            activeOpacity={0.7}
            disabled={uploading || media.length >= maxItems}
          >
            <Video size={18} color="#ffffff" />
            <Text style={styles.buttonText}>Video</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, (uploading || media.length >= maxItems) && styles.buttonDisabled]}
          onPress={pickMedia}
          activeOpacity={0.7}
          disabled={uploading || media.length >= maxItems}
        >
          <Upload size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Choose</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <View style={styles.uploadingInfo}>
            <ActivityIndicator size="small" color="#1f2937" />
            <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
          </View>
        </View>
      )}

      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaScroll}
        >
          {media.map((item, index) => (
            <View key={index} style={styles.mediaItem}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoContainer}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.mediaImage}
                    blurRadius={2}
                  />
                  <View style={styles.videoOverlay}>
                    <Play size={32} color="#ffffff" fill="#ffffff" />
                  </View>
                  <View style={styles.videoBadge}>
                    <Video size={12} color="#ffffff" />
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                  </View>
                </View>
              )}

              {item.uploaded && (
                <View style={styles.uploadedBadge}>
                  <CheckCircle size={16} color="#10b981" />
                </View>
              )}

              {item.fileSize && (
                <View style={styles.fileSizeBadge}>
                  <Text style={styles.fileSizeText}>{formatFileSize(item.fileSize)}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(index)}
                disabled={uploading}
              >
                <X size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  counter: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#374151',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadingContainer: {
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  uploadingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  mediaScroll: {
    marginTop: 12,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  videoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 4,
  },
  videoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 2,
  },
  fileSizeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  fileSizeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
  },
});
