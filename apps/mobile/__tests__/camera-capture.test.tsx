import React from 'react';
import { Platform } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock('@/lib/utils/image-validation', () => ({
  validateImageQuality: jest.fn(() => ({ isValid: true, issues: [], metadata: { width: 1200, height: 900 } })),
}));

import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { CameraCapture } from '@/components/organisms/camera-capture';

const mockUseCameraPermissions = useCameraPermissions as jest.MockedFunction<typeof useCameraPermissions>;
const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.MockedFunction<typeof ImagePicker.launchCameraAsync>;
const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
  typeof ImagePicker.launchImageLibraryAsync
>;
const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;

describe('CameraCapture — Story 5.5-4', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCameraPermissions.mockReturnValue([
      { granted: true } as never,
      jest.fn().mockResolvedValue({ granted: true }) as never,
    ]);
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  async function flush(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function setPlatform(next: 'android' | 'ios' | 'web'): void {
    Object.defineProperty(Platform, 'OS', { value: next });
  }

  async function renderCapture(onPhotoCapture = jest.fn()): Promise<ReactTestRenderer> {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraCapture onPhotoCapture={onPhotoCapture} />);
    });
    return renderer!;
  }

  async function activateIntoReady(renderer: ReactTestRenderer): Promise<void> {
    const takePhotoButton = renderer.root.findAll(
      (node) => node.props?.accessibilityLabel === 'Take a photo' && typeof node.props?.onPress === 'function',
    )[0];

    await act(async () => {
      takePhotoButton.props.onPress();
    });

    await flush();
  }

  it('shows the library button in idle state', async () => {
    const renderer = await renderCapture();

    expect(renderer.root.findByProps({ testID: 'camera-pick-library-idle' })).toBeTruthy();
  });

  it('shows the library button in ready state after camera activation', async () => {
    const renderer = await renderCapture();
    await activateIntoReady(renderer);

    expect(renderer.root.findByProps({ testID: 'camera-pick-library-ready' })).toBeTruthy();
  });

  it('describes library actions to assistive technology', async () => {
    const renderer = await renderCapture();
    const idleButton = renderer.root.findByProps({ testID: 'camera-pick-library-idle' });

    expect(idleButton.props.accessibilityLabel).toBe('Choose a photo from your library');
    expect(idleButton.props.accessibilityHint).toBe('Opens your photo library');

    await activateIntoReady(renderer);
    const readyButton = renderer.root.findByProps({ testID: 'camera-pick-library-ready' });

    expect(readyButton.props.accessibilityLabel).toBe('Choose a photo from your library');
    expect(readyButton.props.accessibilityHint).toBe('Opens your photo library');
  });

  it('uses the ready-state library button to pass selected photo to onPhotoCapture', async () => {
    setPlatform('android');
    const onPhotoCapture = jest.fn();
    const renderer = await renderCapture(onPhotoCapture);

    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as never);
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://test.jpg', width: 1000, height: 900 }],
    } as never);

    await activateIntoReady(renderer);

    const libraryButton = renderer.root.findByProps({ testID: 'camera-pick-library-ready' });
    await act(async () => {
      libraryButton.props.onPress();
    });
    await flush();

    expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    expect(onPhotoCapture).toHaveBeenCalledWith({
      uri: 'file://test.jpg',
      width: 1000,
      height: 900,
    });
  });

  it('skips the media-library preflight on iOS to avoid double prompting', async () => {
    setPlatform('ios');
    const onPhotoCapture = jest.fn();
    const renderer = await renderCapture(onPhotoCapture);

    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://ios-library.jpg', width: 1200, height: 1000 }],
    } as never);

    await activateIntoReady(renderer);

    const libraryButton = renderer.root.findByProps({ testID: 'camera-pick-library-ready' });
    await act(async () => {
      libraryButton.props.onPress();
    });
    await flush();

    expect(mockRequestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    expect(onPhotoCapture).toHaveBeenCalledWith({
      uri: 'file://ios-library.jpg',
      width: 1200,
      height: 1000,
    });
  });

  it('opens the web file picker path without Android permission preflight', async () => {
    setPlatform('web');
    const onPhotoCapture = jest.fn();
    const renderer = await renderCapture(onPhotoCapture);

    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'blob:http://localhost/photo.jpg', width: 900, height: 800 }],
    } as never);

    const libraryButton = renderer.root.findByProps({ testID: 'camera-pick-library-idle' });
    await act(async () => {
      libraryButton.props.onPress();
    });
    await flush();

    expect(mockRequestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    expect(onPhotoCapture).toHaveBeenCalledWith({
      uri: 'blob:http://localhost/photo.jpg',
      width: 900,
      height: 800,
    });
  });

  it('shows an error in idle state when Android library permission is denied', async () => {
    setPlatform('android');
    const onPhotoCapture = jest.fn();
    const renderer = await renderCapture(onPhotoCapture);

    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);

    const libraryButton = renderer.root.findByProps({ testID: 'camera-pick-library-idle' });
    await act(async () => {
      libraryButton.props.onPress();
    });
    await flush();

    expect(renderer.root.findByProps({ children: 'Library access is required to choose a photo.' })).toBeTruthy();
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    expect(onPhotoCapture).not.toHaveBeenCalled();
  });
});
