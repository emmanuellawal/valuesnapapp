// Use the legacy subpath: in Expo SDK 54 the bare `expo-file-system` import
// exposes the new class-based API which does NOT export `EncodingType`. The
// camera screen (apps/mobile/app/(tabs)/camera.tsx) already uses the legacy
// import for the same reason. See Story 5.5-8 for full context.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

const LISTING_PHOTOS_BUCKET = 'listing-photos';

async function readImageBytes(localUri: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const blob = await response.blob();
    return {
      bytes: await blob.arrayBuffer(),
      contentType: blob.type || 'image/jpeg',
    };
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    bytes: decode(base64),
    contentType: 'image/jpeg',
  };
}

export async function uploadListingPhoto(
  localUri: string,
  userId: string,
  valuationId: string,
): Promise<string> {
  const { bytes, contentType } = await readImageBytes(localUri);
  const filePath = `${userId}/${valuationId}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(filePath, bytes, { contentType, upsert: false });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('Photo upload failed: Upload returned no file path');
  }

  const { data: urlData } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(data.path);

  return urlData.publicUrl;
}
