import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  uploadListingPhoto: jest.fn(),
}));

import ListingScreen from '@/app/listing/[id]';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLocalHistory } from '@/lib/localHistory';
import { uploadListingPhoto } from '@/lib/storage';
import { getTextContent } from '@/test-utils/get-text-content';
import type { Valuation } from '@/types/valuation';
import {
  createMockMarketData,
  createMockItemDetails,
  createMockValuation,
  createMockValuationResponse,
} from '@/types/mocks';

const mockUseAuth = useAuth as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUploadListingPhoto = uploadListingPhoto as jest.Mock;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function authenticatedAuth() {
  return {
    session: { access_token: 'token' },
    user: {
      id: 'user-1',
      email: 'user@example.com',
      createdAt: '2026-03-27T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
  };
}

describe('ListingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocalSearchParams.mockReturnValue({ id: 'valuation-1' });
    mockGetLocalHistory.mockResolvedValue([]);
    mockUploadListingPhoto.mockResolvedValue(
      'https://example.supabase.co/listing-photos/user-1/valuation-1_123.jpg',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    return renderer!;
  }

  it('redirects guest users to register', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    await renderScreen();

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/register');
  });

  it('provides a back button for authenticated users', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const button = renderer.root.findByProps({ accessibilityLabel: 'Go back' });

    await act(async () => {
      button.props.onPress();
    });

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows a loading state while valuation data is being fetched', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let resolveHistory!: (value: Valuation[]) => void;
    mockGetLocalHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ListingScreen />);
    });

    // Loading indicator visible before history resolves
    expect(renderer!.root.findByProps({ children: 'Loading…' })).toBeTruthy();
    expect(() => findByTestId(renderer!, 'listing-title-input')).toThrow();

    // Resolve and flush — form should appear
    await act(async () => {
      resolveHistory([]);
      await Promise.resolve();
    });

    expect(findByTestId(renderer!, 'listing-title-input')).toBeTruthy();
  });

  it('pre-fills the title when valuation item details are available', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        imageUri: 'file:///path/to/photo.jpg',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            brand: 'Canon',
            model: 'AE-1',
            itemType: '35mm Film Camera',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-title-input').props.value).toBe(
      'Canon AE-1 35mm Film Camera',
    );
    expect(findByTestId(renderer, 'listing-description-input').props.value).toBe(
      'Mock item description for eBay listing.',
    );
    expect(findByTestId(renderer, 'listing-category-input').props.value).toBe('Test Category');
    expect(findByTestId(renderer, 'listing-condition-option-good').props.className).toContain(
      'bg-ink',
    );
    expect(findByTestId(renderer, 'listing-price-input').props.value).toBe('150');
    expect(getTextContent(findByTestId(renderer, 'listing-title-ai-badge').props.children)).toBe(
      'AI-generated',
    );
    expect(
      getTextContent(findByTestId(renderer, 'listing-description-ai-badge').props.children),
    ).toBe('AI-generated');
    expect(getTextContent(findByTestId(renderer, 'listing-price-ai-badge').props.children)).toBe(
      'AI-generated',
    );
    expect(getTextContent(findByTestId(renderer, 'listing-category-ai-badge').props.children)).toBe(
      'AI-generated',
    );
    expect(getTextContent(findByTestId(renderer, 'listing-condition-ai-badge').props.children)).toBe(
      'AI-generated',
    );
    expect(findByTestId(renderer, 'listing-photo-image').props.source).toEqual({
      uri: 'file:///path/to/photo.jpg',
    });
    expect(findByTestId(renderer, 'listing-photo-image').props.accessibilityLabel).toBe(
      'Valuation photo',
    );
    expect(() => findByTestId(renderer, 'listing-photo-placeholder')).toThrow();
  });

  it('does not pre-fill category when categoryHint is empty', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            brand: 'Canon',
            model: 'AE-1',
            itemType: '35mm Film Camera',
            categoryHint: '',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-category-input').props.value).toBe('');
    expect(() => findByTestId(renderer, 'listing-category-ai-badge')).toThrow();
  });

  it('pre-fills the condition when visualCondition maps to a valid ListingCondition', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            visualCondition: 'used_excellent',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-condition-option-like_new').props.className).toContain(
      'bg-ink',
    );
    expect(
      getTextContent(findByTestId(renderer, 'listing-condition-ai-badge').props.children),
    ).toBe('AI-generated');
  });

  it('does not pre-fill condition when visualCondition is "damaged"', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            visualCondition: 'damaged',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-condition-option-good').props.className).toContain(
      'bg-paper',
    );
    expect(() => findByTestId(renderer, 'listing-condition-ai-badge')).toThrow();
  });

  it('does not pre-fill price when fairMarketValue is absent', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          valuationId: 'valuation-1',
          marketData: createMockMarketData({ status: 'no_data', fairMarketValue: undefined }),
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-price-input').props.value).toBe('');
    expect(() => findByTestId(renderer, 'listing-price-ai-badge')).toThrow();
  });

  it('does not pre-fill price when fairMarketValue is zero', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          valuationId: 'valuation-1',
          marketData: createMockMarketData({ fairMarketValue: 0 }),
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-price-input').props.value).toBe('');
    expect(() => findByTestId(renderer, 'listing-price-ai-badge')).toThrow();
    expect(() => findByTestId(renderer, 'listing-price-range-caption')).toThrow();
  });

  it('shows price range caption when priceRange is available and price is pre-filled', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-price-range-caption')).toBeTruthy();
  });

  it('passes imageUri to ListingForm when the valuation has one', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        imageUri: 'file:///path/to/photo.jpg',
        response: createMockValuationResponse({ valuationId: 'valuation-1' }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-photo-image')).toBeTruthy();
    expect(findByTestId(renderer, 'listing-photo-image').props.source).toEqual({
      uri: 'file:///path/to/photo.jpg',
    });
    expect(findByTestId(renderer, 'listing-photo-image').props.accessibilityLabel).toBe(
      'Valuation photo',
    );
    expect(() => findByTestId(renderer, 'listing-photo-placeholder')).toThrow();
  });

  it('shows the photo placeholder when the valuation has no imageUri', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        imageUri: undefined,
        response: createMockValuationResponse({ valuationId: 'valuation-1' }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-photo-placeholder')).toBeTruthy();
    expect(() => findByTestId(renderer, 'listing-photo-image')).toThrow();
  });

  it('renders the form with an empty title when valuation is not found', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-title-input').props.value).toBe('');
  });

  it('does not show the AI badge when all title tokens are unknown', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            brand: 'unknown',
            model: 'unknown',
            itemType: 'unknown',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-title-input').props.value).toBe('');
    expect(() => findByTestId(renderer, 'listing-title-ai-badge')).toThrow();
  });

  it('does not show the description AI badge when description is empty', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({
          itemDetails: createMockItemDetails({
            brand: 'Canon',
            model: 'AE-1',
            itemType: '35mm Film Camera',
            description: '',
          }),
          valuationId: 'valuation-1',
        }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-description-input').props.value).toBe('');
    expect(() => findByTestId(renderer, 'listing-description-ai-badge')).toThrow();
  });

  it('hides the title AI badge in the form when the title field is edited', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([
      createMockValuation({
        id: 'valuation-1',
        response: createMockValuationResponse({ valuationId: 'valuation-1' }),
      }),
    ]);

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'listing-title-ai-badge')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer, 'listing-title-input').props.onChangeText('Custom Title');
    });

    expect(() => findByTestId(renderer, 'listing-title-ai-badge')).toThrow();
  });

  it('shows an error when the valuation id is missing', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockUseLocalSearchParams.mockReturnValue({});

    const renderer = await renderScreen();

    expect(
      renderer.root.findByProps({
        children: 'Listing could not be opened because the valuation ID is missing.',
      }),
    ).toBeTruthy();
  });

  describe('photo upload', () => {
    it('calls uploadListingPhoto with imageUri, userId, and valuationId when imageUri is present', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///path/to/photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      await renderScreen();

      expect(mockUploadListingPhoto).toHaveBeenCalledWith(
        'file:///path/to/photo.jpg',
        'user-1',
        'valuation-1',
      );
    });

    it('shows the upload status caption while upload is in progress', async () => {
      const pendingUpload = deferred<string>();
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);
      mockUploadListingPhoto.mockReturnValue(pendingUpload.promise);

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-photo-upload-status')).toBeTruthy();
    });

    it('hides the upload status caption after upload resolves', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);
      mockUploadListingPhoto.mockResolvedValue('https://example.com/photo.jpg');

      const renderer = await renderScreen();

      expect(() => findByTestId(renderer, 'listing-photo-upload-status')).toThrow();
    });

    it('shows the error caption when uploadListingPhoto rejects', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);
      mockUploadListingPhoto.mockRejectedValue(new Error('Network error'));

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-photo-upload-status')).toBeTruthy();
      expect(getTextContent(findByTestId(renderer, 'listing-photo-upload-status').props.children)).toBe(
        'Photo upload failed — listing will copy without a photo URL',
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith('Photo upload failed:', expect.any(Error));
    });

    it('retries the upload when the retry control is pressed after a failure', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);
      mockUploadListingPhoto
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('https://example.com/photo.jpg');

      const renderer = await renderScreen();

      expect(mockUploadListingPhoto).toHaveBeenCalledTimes(1);

      await act(async () => {
        findByTestId(renderer, 'listing-photo-upload-retry-button').props.onPress();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockUploadListingPhoto).toHaveBeenCalledTimes(2);
      expect(() => findByTestId(renderer, 'listing-photo-upload-status')).toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Photo upload failed:', expect.any(Error));
    });

    it('does not call uploadListingPhoto when the valuation has no imageUri', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: undefined,
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      await renderScreen();

      expect(mockUploadListingPhoto).not.toHaveBeenCalled();
    });

    it('calls uploadListingPhoto exactly once even if the component re-renders with a new auth object', async () => {
      mockUseAuth.mockImplementation(() => authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(<ListingScreen />);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockUploadListingPhoto).toHaveBeenCalledTimes(1);

      await act(async () => {
        renderer!.update(<ListingScreen />);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockUploadListingPhoto).toHaveBeenCalledTimes(1);
    });
  });
});