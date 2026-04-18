import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

const LISTING_PHOTOS_BUCKET = 'listing-photos';

export async function uploadListingPhoto(
  localUri: string,
  userId: string,
  valuationId: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = decode(base64);
  const filePath = `${userId}/${valuationId}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('Photo upload failed: Upload returned no file path');
  }

  const { data: urlData } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(data.path);

  return urlData.publicUrl;
}