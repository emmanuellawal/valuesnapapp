/**
 * CameraCapture - Camera Organism with Permission Handling
 * 
 * Main camera component that handles:
 * - Camera permission requests
 * - Photo capture via expo-image-picker (more reliable than CameraView on iOS)
 * - Photo preview and confirmation
 * - State machine for camera lifecycle
 * 
 * Swiss Minimalist design:
 * - Clean capture interface with prominent button
 * - Minimal visual elements
 * - Typography-driven feedback
 * 
 * @see Story 1.1: Implement Mobile Camera Capture
 * @see docs/SWISS-MINIMALIST.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Image, Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';
import { validateImageQuality, type ImageQualityIssue } from '@/lib/utils/image-validation';
import type { CameraCaptureProps, CameraState, CapturedPhoto } from './types';

/**
 * Camera capture quality setting (0.0 - 1.0)
 * 0.8 balances image quality with file size for fast upload and processing
 */
const CAMERA_QUALITY = 0.8;

/**
 * CameraCapture organism
 * 
 * Uses expo-image-picker for reliable photo capture on iOS
 * State machine:
 * - idle → ready (camera permission granted)
 * - idle → denied (camera permission refused)
 * - ready → preview (photo captured, awaiting confirmation)
 * - preview → captured (user confirms photo)
 * - preview → ready (user retakes)
 */
export function CameraCapture({ 
  onPhotoCapture, 
  onStateChange,
  testID = 'camera-capture'
}: CameraCaptureProps) {
  // Camera permission hook from expo-camera
  const [permission, requestPermission] = useCameraPermissions();
  
  // Camera state machine
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  
  // Captured photo storage
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  
  // Error message for user-visible failures
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quality validation warnings (Story 1.5)
  const [qualityIssues, setQualityIssues] = useState<ImageQualityIssue[]>([]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(cameraState);
  }, [cameraState, onStateChange]);

  // Cleanup on unmount - prevent memory leaks
  useEffect(() => {
    return () => {
      setCapturedPhoto(null);
    };
  }, []);

  /**
   * Launch the system camera using ImagePicker
   * This is much more reliable than CameraView on iOS
   */
  const handleLaunchCamera = useCallback(async () => {
    setErrorMessage(null);
    
    // Request permission if not granted
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setCameraState('denied');
        return;
      }
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: CAMERA_QUALITY,
        allowsEditing: false,
        exif: false,
      });
      
      if (result.canceled) {
        // User cancelled - stay in ready state
        return;
      }
      
      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const photo: CapturedPhoto = {
          uri: asset.uri,
          width: asset.width || 0,
          height: asset.height || 0,
        };
        
        setCapturedPhoto(photo);
        
        // Validate photo quality
        const qualityResult = validateImageQuality(photo.width, photo.height);
        setQualityIssues(qualityResult.issues);
        
        setCameraState('preview');
      }
    } catch (error) {
      console.error('Camera launch error:', error);
      setErrorMessage('Failed to open camera. Please try again.');
    }
  }, [permission, requestPermission]);

  /**
   * Handle initial camera activation
   */
  const handleActivateCamera = useCallback(async () => {
    setCameraState('requesting');
    
    const result = await requestPermission();
    
    if (result.granted) {
      setCameraState('ready');
      // Immediately launch camera for better UX
      handleLaunchCamera();
    } else {
      setCameraState('denied');
    }
  }, [requestPermission, handleLaunchCamera]);

  /**
   * Handle file upload fallback (when camera permission denied)
   */
  const handleFileUpload = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: CAMERA_QUALITY,
        allowsEditing: false,
      });
      
      if (result.canceled) {
        return;
      }
      
      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const photo: CapturedPhoto = {
          uri: asset.uri,
          width: asset.width || 0,
          height: asset.height || 0,
        };
        
        setCapturedPhoto(photo);
        setCameraState('captured');
        onPhotoCapture(photo);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setErrorMessage('Failed to upload photo. Please try again.');
    }
  }, [onPhotoCapture]);

  /**
   * Handle retake action - clear photo and return to ready
   */
  const handleRetake = useCallback(() => {
    setCapturedPhoto(null);
    setQualityIssues([]);
    setErrorMessage(null);
    setCameraState('ready');
    // Immediately launch camera again
    handleLaunchCamera();
  }, [handleLaunchCamera]);

  /**
   * Handle use photo action - proceed to processing
   */
  const handleUsePhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    
    const photoToProcess = capturedPhoto;
    setCameraState('captured');
    
    try {
      await onPhotoCapture(photoToProcess);
    } catch (error) {
      console.error('Photo processing failed:', error);
      setErrorMessage('Processing failed. Please try again.');
      setCameraState('preview');
    }
  }, [capturedPhoto, onPhotoCapture]);

  /**
   * Open device settings for camera permission
   */
  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  /**
   * Render idle state - activation button
   */
  if (cameraState === 'idle') {
    return (
      <Stack gap={4} className="w-full items-center">
        <Box 
          className="w-48 h-48 bg-paper border-2 border-ink items-center justify-center"
          testID={`${testID}-idle`}
        >
          <SwissPressable
            onPress={handleActivateCamera}
            accessibilityLabel="Take a photo"
            accessibilityRole="button"
            className="w-full h-full items-center justify-center"
          >
            <Text variant="h1" className="text-ink-muted">+</Text>
          </SwissPressable>
        </Box>
        <Text variant="caption" className="text-ink-muted">
          Tap to take a photo
        </Text>
      </Stack>
    );
  }

  /**
   * Render requesting state - loading indicator
   */
  if (cameraState === 'requesting') {
    return (
      <Stack gap={4} className="w-full items-center">
        <Box 
          className="w-48 h-48 bg-divider border-2 border-ink items-center justify-center"
          testID={`${testID}-requesting`}
        >
          <Text variant="body" className="text-ink-muted">
            Opening camera...
          </Text>
        </Box>
      </Stack>
    );
  }

  /**
   * Render denied state - permission denied with alternatives
   */
  if (cameraState === 'denied') {
    return (
      <Stack gap={4} className="w-full">
        <Text variant="body" className="text-ink">
          Camera access needed
        </Text>
        <Text variant="caption" className="text-ink-muted">
          Enable camera in Settings, or upload a photo instead.
        </Text>
        
        {errorMessage && (
          <Text variant="caption" className="text-signal">
            {errorMessage}
          </Text>
        )}
        
        <Stack gap={3}>
          <SwissPressable
            onPress={handleOpenSettings}
            accessibilityLabel="Open settings to enable camera"
            className="py-3 px-4 bg-ink"
          >
            <Text variant="body" className="text-paper text-center">
              Open Settings
            </Text>
          </SwissPressable>
          
          <SwissPressable
            onPress={handleFileUpload}
            accessibilityLabel="Upload a photo from library"
            className="py-3 px-4 border-2 border-ink bg-paper"
          >
            <Text variant="body" className="text-ink text-center">
              Upload Photo
            </Text>
          </SwissPressable>
        </Stack>
      </Stack>
    );
  }

  /**
   * Render ready state - camera ready, tap to capture
   */
  if (cameraState === 'ready') {
    return (
      <Stack gap={4} className="w-full items-center">
        <Box 
          className="w-48 h-48 bg-paper border-2 border-ink items-center justify-center"
          testID={`${testID}-ready`}
        >
          <SwissPressable
            onPress={handleLaunchCamera}
            accessibilityLabel="Take a photo"
            accessibilityRole="button"
            className="w-full h-full items-center justify-center"
          >
            <Text variant="h1" className="text-ink">+</Text>
          </SwissPressable>
        </Box>
        
        {errorMessage && (
          <Text variant="caption" className="text-signal">
            {errorMessage}
          </Text>
        )}
        
        <Text variant="caption" className="text-ink-muted">
          Tap to take a photo
        </Text>
      </Stack>
    );
  }

  /**
   * Render preview state - photo captured, confirm or retake
   */
  if (cameraState === 'preview' && capturedPhoto) {
    return (
      <Stack gap={4} className="w-full">
        {/* Photo preview — Museum Mat framing */}
        <Box 
          className="w-full border border-divider p-1 bg-paper"
          testID={`${testID}-preview`}
        >
          <Image
            source={{ uri: capturedPhoto.uri }}
            className="w-full aspect-square"
            resizeMode="cover"
          />
        </Box>
        
        {/* Quality warnings */}
        {qualityIssues.length > 0 && (
          <Stack gap={2}>
            {qualityIssues.map((issue, index) => (
              <Text key={index} variant="caption" className="text-signal">
                ⚠️ {issue.message}
              </Text>
            ))}
          </Stack>
        )}
        
        {errorMessage && (
          <Text variant="caption" className="text-signal">
            {errorMessage}
          </Text>
        )}
        
        {/* Action buttons */}
        <Stack gap={3}>
          <SwissPressable
            onPress={handleUsePhoto}
            accessibilityLabel="Use this photo"
            className="py-4 bg-ink"
          >
            <Text variant="body" className="text-paper text-center">
              {qualityIssues.length > 0 ? 'Use Anyway' : 'Use Photo'}
            </Text>
          </SwissPressable>
          
          <SwissPressable
            onPress={handleRetake}
            accessibilityLabel="Take another photo"
            className="py-4 border-2 border-ink bg-paper"
          >
            <Text variant="body" className="text-ink text-center">
              Retake
            </Text>
          </SwissPressable>
        </Stack>
      </Stack>
    );
  }

  /**
   * Render captured state - processing
   */
  if (cameraState === 'captured' && capturedPhoto) {
    return (
      <Stack gap={4} className="w-full">
        <Box 
          className="w-full border border-divider p-1 bg-paper"
          testID={`${testID}-captured`}
        >
          <Image
            source={{ uri: capturedPhoto.uri }}
            className="w-full aspect-square"
            resizeMode="cover"
          />
        </Box>
        <Text variant="caption" className="text-ink-muted">
          Processing...
        </Text>
      </Stack>
    );
  }

  // Fallback - should not reach here
  return null;
}
