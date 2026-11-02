import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface MediaItem {
  uri: string;
  type: 'photo' | 'video';
  uploaded?: boolean;
  publicUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export async function uploadMedia(
  uri: string,
  folder: 'tractors' | 'service' | 'damage' | 'profile-photos'
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Media upload not supported on web');
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileExtension = 'jpg';
    const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

export async function uploadMediaItem(
  item: MediaItem,
  folder: 'tractors' | 'service' | 'damage'
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const response = await fetch(item.uri);
    const blob = await response.blob();

    const fileExtension = item.type === 'video' ? 'mp4' : 'jpg';
    const fileName = item.fileName || `${folder}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
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
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    return null;
  }
}

export async function uploadMultipleMedia(
  mediaItems: MediaItem[],
  folder: 'tractors' | 'service' | 'damage'
): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const uploadedUrls: string[] = [];

  for (const item of mediaItems) {
    if (!item.uploaded) {
      const url = await uploadMediaItem(item, folder);
      if (url) {
        uploadedUrls.push(url);
      }
    } else if (item.publicUrl) {
      uploadedUrls.push(item.publicUrl);
    }
  }

  return uploadedUrls;
}

export function isMediaItem(obj: any): obj is MediaItem {
  return (
    obj &&
    typeof obj.uri === 'string' &&
    (obj.type === 'photo' || obj.type === 'video')
  );
}

export function getMediaTypeFromUrl(url: string): 'photo' | 'video' {
  const extension = url.split('.').pop()?.toLowerCase();
  return extension === 'mp4' || extension === 'mov' ? 'video' : 'photo';
}
