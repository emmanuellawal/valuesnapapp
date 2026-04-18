import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { uploadListingPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn((value: string) => new ArrayBuffer(value.length)),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockDecode = decode as jest.Mock;
const mockFrom = supabase.storage.from as jest.Mock;
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

describe('uploadListingPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });
  });

  it('reads the local file as base64 using FileSystem.readAsStringAsync', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

    await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

    expect(mockReadAsStringAsync).toHaveBeenCalledWith('file:///photo.jpg', {
      encoding: FileSystem.EncodingType.Base64,
    });
  });

  it('decodes base64 string before uploading', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

    await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

    expect(mockDecode).toHaveBeenCalledWith('base64data');
  });

  it('uploads to the listing-photos bucket', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

    await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

    expect(mockFrom).toHaveBeenCalledWith('listing-photos');
  });

  it('uploads with a path that starts with {userId}/{valuationId}_', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1_1234.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

    await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

    const uploadCall = mockUpload.mock.calls[0];
    expect(uploadCall[0]).toMatch(/^user-1\/val-1_\d+\.jpg$/);
    expect(uploadCall[2]).toMatchObject({ contentType: 'image/jpeg' });
  });

  it('returns the public URL on a successful upload', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://example.supabase.co/listing-photos/user-1/val-1.jpg' },
    });

    const url = await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

    expect(url).toBe('https://example.supabase.co/listing-photos/user-1/val-1.jpg');
  });

  it('throws when supabase storage returns an error', async () => {
    mockReadAsStringAsync.mockResolvedValueOnce('base64data');
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row level security violation' },
    });

    await expect(uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1')).rejects.toThrow(
      'Photo upload failed: Row level security violation',
    );
  });
});