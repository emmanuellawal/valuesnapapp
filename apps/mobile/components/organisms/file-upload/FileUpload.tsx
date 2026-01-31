/**
 * FileUpload Component
 * 
 * File upload organism with drag-and-drop support for desktop browsers.
 * Provides an alternative to camera capture for desktop users.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Click-to-browse file picker via expo-image-picker
 * - File validation (format, size)
 * - Swiss Minimalist design patterns
 * - Accessibility compliant (WCAG 2.1 AA)
 * 
 * State Machine: idle → dragging → validating → uploaded (or error)
 * 
 * @see Story 1.2: Implement File Upload for Desktop
 * @see docs/SWISS-MINIMALIST.md
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';
import { 
  FileUploadState, 
  FileUploadError, 
  FileUploadProps, 
  CapturedPhoto 
} from './types';

// Constants - no magic numbers (Story 1.1 learning)
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE_MB = 10;

/**
 * Validate a file for format and size
 */
const validateFile = (file: File): FileUploadError | null => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      type: 'invalid_format',
      message: 'Please upload JPG, PNG, or WEBP image'
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: 'file_too_large',
      message: `Image must be under ${MAX_FILE_SIZE_MB}MB`
    };
  }
  
  return null; // Valid file
};

/**
 * Get image dimensions from a blob URL
 */
const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web') {
      // On native, expo-image-picker provides dimensions
      resolve({ width: 0, height: 0 });
      return;
    }
    
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = uri;
  });
};

export function FileUpload({ 
  onPhotoCapture, 
  onStateChange,
  testID 
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<FileUploadState>('idle');
  const [uploadError, setUploadError] = useState<FileUploadError | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<CapturedPhoto | null>(null);
  const uploadZoneRef = useRef<View>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(uploadState);
  }, [uploadState, onStateChange]);

  // Cleanup object URL on unmount to prevent memory leaks (Story 1.2 validation note)
  useEffect(() => {
    return () => {
      if (objectUrlRef.current && Platform.OS === 'web') {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  /**
   * Update state and clear previous errors
   */
  const updateState = useCallback((state: FileUploadState) => {
    setUploadState(state);
    if (state !== 'error') {
      setUploadError(null);
    }
  }, []);

  /**
   * Handle file selection via expo-image-picker
   * Click-to-browse fallback for users who don't use drag-and-drop
   */
  const handleFilePick = useCallback(async () => {
    try {
      updateState('validating');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      
      if (result.canceled) {
        updateState('idle');
        return;
      }
      
      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        updateState('uploading');
        
        // Get dimensions if not provided by expo-image-picker (web platform)
        let width = asset.width || 0;
        let height = asset.height || 0;
        
        if (width === 0 || height === 0) {
          try {
            const dimensions = await getImageDimensions(asset.uri);
            width = dimensions.width;
            height = dimensions.height;
          } catch (error) {
            console.warn('Could not determine image dimensions:', error);
            // Continue with 0x0 - will be determined by Image component
          }
        }
        
        // Convert to CapturedPhoto format (matching Story 1.1)
        const photo: CapturedPhoto = {
          uri: asset.uri,
          width,
          height,
        };
        
        setUploadedPhoto(photo);
        updateState('uploaded');
        onPhotoCapture(photo);
      }
    } catch (error) {
      console.error('File pick error:', error);
      setUploadError({
        type: 'read_error',
        message: 'Failed to read file. Please try again.'
      });
      updateState('error');
    }
  }, [onPhotoCapture, updateState]);

  /**
   * Handle drag over event
   * CRITICAL: preventDefault() must be called for drop to work
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState !== 'dragging') {
      updateState('dragging');
    }
  }, [uploadState, updateState]);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateState('idle');
  }, [updateState]);

  /**
   * Handle file drop event
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    updateState('validating');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => ACCEPTED_TYPES.includes(f.type));
    
    if (!imageFile) {
      setUploadError({
        type: 'invalid_format',
        message: 'Please upload JPG, PNG, or WEBP image'
      });
      updateState('error');
      return;
    }
    
    const validationError = validateFile(imageFile);
    if (validationError) {
      setUploadError(validationError);
      updateState('error');
      return;
    }
    
    try {
      updateState('uploading');
      
      // Create blob URL for the file
      const uri = URL.createObjectURL(imageFile);
      objectUrlRef.current = uri; // Store for cleanup
      
      // Get image dimensions
      let dimensions;
      try {
        dimensions = await getImageDimensions(uri);
      } catch (dimensionError) {
        // Image file is corrupted or unsupported
        console.error('Image load error:', dimensionError);
        setUploadError({
          type: 'read_error',
          message: 'Image file appears corrupted or unsupported'
        });
        updateState('error');
        return;
      }
      
      // Convert to CapturedPhoto format (matching Story 1.1)
      const photo: CapturedPhoto = {
        uri,
        width: dimensions.width,
        height: dimensions.height,
      };
      
      setUploadedPhoto(photo);
      updateState('uploaded');
      onPhotoCapture(photo);
    } catch (error) {
      console.error('File processing error:', error);
      setUploadError({
        type: 'read_error',
        message: 'Failed to process file. Please try again.'
      });
      updateState('error');
    }
  }, [onPhotoCapture, updateState]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setUploadError(null);
    setUploadedPhoto(null);
    updateState('idle');
  }, [updateState]);

  /**
   * Get upload zone border style based on state
   * Swiss Design: ink (default), signal (hover/drag)
   */
  const getZoneBorderStyle = () => {
    switch (uploadState) {
      case 'dragging':
        return 'border-2 border-signal';
      case 'error':
        return 'border border-signal';
      default:
        return 'border border-ink';
    }
  };

  /**
   * Get instruction text based on state
   */
  const getInstructionText = () => {
    switch (uploadState) {
      case 'dragging':
        return 'Drop photo to upload';
      case 'validating':
        return 'Validating...';
      case 'uploading':
        return 'Processing...';
      case 'uploaded':
        return 'Processing...';
      case 'error':
        return uploadError?.message || 'Upload failed';
      default:
        return 'Drag photo here';
    }
  };

  // Render uploaded photo preview
  if (uploadState === 'uploaded' && uploadedPhoto) {
    return (
      <Box
        className="w-full"
        testID={testID}
        accessibilityLabel="Photo uploaded successfully"
        accessibilityLiveRegion="polite"
      >
        <Box className="w-full aspect-[4/3] bg-divider border border-ink overflow-hidden">
          <Image
            source={{ uri: uploadedPhoto.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            accessibilityLabel="Uploaded photo preview"
          />
        </Box>
        <Text 
          variant="body" 
          className="text-ink-light mt-4"
          accessibilityLiveRegion="polite"
        >
          Processing...
        </Text>
      </Box>
    );
  }

  // Render error state with retry
  if (uploadState === 'error') {
    return (
      <Box
        className="w-full"
        testID={testID}
        accessibilityLabel="Upload error"
        accessibilityLiveRegion="assertive"
      >
        <SwissPressable
          onPress={handleRetry}
          accessibilityLabel="Click to try again"
          accessibilityRole="button"
          className="w-full"
        >
          <Box className={`w-full aspect-[4/3] bg-paper ${getZoneBorderStyle()} items-center justify-center p-6`}>
            <Stack gap={2} className="items-center">
              <Text variant="body" className="text-signal text-center">
                {uploadError?.message || 'Upload failed'}
              </Text>
              <Text variant="caption" className="text-ink-muted text-center">
                Click to try again
              </Text>
            </Stack>
          </Box>
        </SwissPressable>
        <Text variant="caption" className="text-ink-muted mt-4">
          JPG, PNG, WEBP • Max {MAX_FILE_SIZE_MB}MB
        </Text>
      </Box>
    );
  }

  // Render upload zone (idle, dragging, validating, uploading)
  return (
    <Box
      className="w-full"
      testID={testID}
      accessibilityLabel="File upload zone"
    >
      {/* 
        Upload zone with drag-and-drop
        Using View for drag events on web - React Native Web supports these
      */}
      <View
        ref={uploadZoneRef}
        // @ts-expect-error - React Native Web supports drag events
        onDragOver={Platform.OS === 'web' ? handleDragOver : undefined}
        onDragLeave={Platform.OS === 'web' ? handleDragLeave : undefined}
        onDrop={Platform.OS === 'web' ? handleDrop : undefined}
      >
        <SwissPressable
          onPress={handleFilePick}
          accessibilityLabel="Click to browse files or drag and drop an image"
          accessibilityRole="button"
          accessibilityHint="Opens file picker to select an image"
          disabled={uploadState === 'validating' || uploadState === 'uploading'}
          className="w-full"
        >
          <Box 
            className={`w-full aspect-[4/3] bg-paper ${getZoneBorderStyle()} items-center justify-center p-6`}
            accessibilityLiveRegion="polite"
          >
            <Stack gap={2} className="items-center">
              {/* Upload icon - simple text representation for Swiss Minimalist */}
              <Text variant="display" className="text-ink mb-2">
                📁
              </Text>
              
              <Text variant="body" className="text-ink text-center">
                {getInstructionText()}
              </Text>
              
              {uploadState === 'idle' && (
                <Text variant="caption" className="text-ink-muted text-center">
                  or click to browse
                </Text>
              )}
            </Stack>
          </Box>
        </SwissPressable>
      </View>
      
      {/* Format guidance - Swiss caption style */}
      <Text variant="caption" className="text-ink-muted mt-4">
        JPG, PNG, WEBP • Max {MAX_FILE_SIZE_MB}MB
      </Text>
    </Box>
  );
}

export default FileUpload;
