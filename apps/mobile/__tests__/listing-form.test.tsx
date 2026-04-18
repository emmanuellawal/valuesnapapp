import React from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

import { ListingForm } from '@/components/organisms/listing-form';
import { getTextContent } from '@/test-utils/get-text-content';
import type { ListingFormValues } from '@/types/listing';
import { LISTING_TITLE_MAX_LENGTH } from '@/types/listing';

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

describe('ListingForm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all listing fields and the CTA', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    expect(findByTestId(renderer!, 'listing-title-input')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-category-input')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-condition-option-new')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-price-input')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-description-input')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-photo-placeholder')).toBeTruthy();
    expect(() => findByTestId(renderer!, 'listing-photo-image')).toThrow();
    expect(findByTestId(renderer!, 'listing-submit-button')).toBeTruthy();
  });

  it('renders the photo image when photoUri is provided', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" photoUri="file:///path/to/photo.jpg" />,
      );
    });

    expect(findByTestId(renderer!, 'listing-photo-image')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-photo-image').props.source).toEqual({
      uri: 'file:///path/to/photo.jpg',
    });
    expect(findByTestId(renderer!, 'listing-photo-image').props.accessibilityLabel).toBe(
      'Valuation photo',
    );
    expect(() => findByTestId(renderer!, 'listing-photo-placeholder')).toThrow();
  });

  it('renders the placeholder when photoUri is not provided', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    expect(findByTestId(renderer!, 'listing-photo-placeholder')).toBeTruthy();
    expect(() => findByTestId(renderer!, 'listing-photo-image')).toThrow();
  });

  it('renders the placeholder when photoUri is an empty string', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" photoUri="" />);
    });

    expect(findByTestId(renderer!, 'listing-photo-placeholder')).toBeTruthy();
    expect(() => findByTestId(renderer!, 'listing-photo-image')).toThrow();
  });

  it('renders a pre-filled title from initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ title: 'Canon AE-1 35mm Film Camera' }}
        />,
      );
    });

    expect(findByTestId(renderer!, 'listing-title-input').props.value).toBe(
      'Canon AE-1 35mm Film Camera',
    );
  });

  it('renders a pre-filled description from initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ description: 'A Canon AE-1 SLR in good working condition.' }}
        />,
      );
    });

    expect(findByTestId(renderer!, 'listing-description-input').props.value).toBe(
      'A Canon AE-1 SLR in good working condition.',
    );
  });

  it('renders a pre-filled price from initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ price: '249' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-price-input').props.value).toBe('249');
  });

  it('renders a pre-filled category from initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ category: 'Film Cameras' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-category-input').props.value).toBe('Film Cameras');
  });

  it('renders a pre-filled condition from initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-condition-option-good').props.className).toContain(
      'bg-ink',
    );
  });

  it('shows the AI-generated badge when initialValues.title is non-empty', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
      );
    });

    expect(getTextContent(findByTestId(renderer!, 'listing-title-ai-badge').props.children)).toBe(
      'AI-generated',
    );
  });

  it('does not show the AI-generated badge without initialValues', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
  });

  it('does not show the title AI badge when title is whitespace only', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: '   ' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
  });

  it('shows the AI-generated badge on price when initialValues.price is non-empty', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ price: '249' }} />,
      );
    });

    expect(getTextContent(findByTestId(renderer!, 'listing-price-ai-badge').props.children)).toBe(
      'AI-generated',
    );
  });

  it('shows the AI-generated badge on category when initialValues.category is non-empty', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ category: 'Film Cameras' }} />,
      );
    });

    expect(
      getTextContent(findByTestId(renderer!, 'listing-category-ai-badge').props.children),
    ).toBe('AI-generated');
  });

  it('shows the AI-generated badge on condition when initialValues.condition is set', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ condition: 'like_new' }} />,
      );
    });

    expect(
      getTextContent(findByTestId(renderer!, 'listing-condition-ai-badge').props.children),
    ).toBe('AI-generated');
  });

  it('does not show the category AI badge without initialValues.category', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow();
  });

  it('does not show the condition AI badge without initialValues.condition', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();
  });

  it('does not show the condition AI badge when condition is an empty string', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ condition: '' as ListingFormValues['condition'] }}
        />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();
  });

  it('does not show the category AI badge when category is empty string', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ category: '' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow();
  });

  it('does not show the category AI badge when category is whitespace only', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ category: '   ' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow();
  });

  it('does not show the price AI badge without initialValues.price', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow();
  });

  it('does not show the price AI badge when price is empty string', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ price: '' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow();
  });

  it('shows the AI-generated badge on description when initialValues.description is non-empty', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ description: 'A Canon AE-1 SLR.' }}
        />,
      );
    });

    expect(
      getTextContent(findByTestId(renderer!, 'listing-description-ai-badge').props.children),
    ).toBe('AI-generated');
  });

  it('does not show the description AI badge without initialValues.description', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow();
  });

  it('does not show the description AI badge when description is an empty string', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ description: '' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow();
  });

  it('does not show the description AI badge when description is whitespace only', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ description: '   ' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow();
  });

  it('hides the title AI badge when the title field is edited', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Vintage Camera' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('My Camera');
    });

    expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
  });

  it('restores the title AI badge when the original AI value is re-entered', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ title: 'Vintage Camera' }} />,
      );
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('My Camera');
    });

    expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
    });

    expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();
  });

  it('hides the category AI badge when the category field is edited', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ category: 'Electronics' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-category-ai-badge')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
    });

    expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow();
  });

  it('hides the price AI badge when the price field is edited', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ price: '49.99' }}
          priceRange={{ min: 40, max: 60 }}
        />,
      );
    });

    expect(findByTestId(renderer!, 'listing-price-ai-badge')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-price-range-caption')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('55.00');
    });

    expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow();
    expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow();
  });

  it('restores the price AI badge and price range caption when the original AI value is re-entered', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ price: '49.99' }}
          priceRange={{ min: 40, max: 60 }}
        />,
      );
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('55.00');
    });

    expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow();
    expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow();

    await act(async () => {
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('49.99');
    });

    expect(findByTestId(renderer!, 'listing-price-ai-badge')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-price-range-caption')).toBeTruthy();
  });

  it('hides the description AI badge when the description field is edited', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ description: 'AI description' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-description-ai-badge')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer!, 'listing-description-input').props.onChangeText('My description');
    });

    expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow();
  });

  it('renders all 5 condition picker options', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    expect(findByTestId(renderer!, 'listing-condition-option-new')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-condition-option-like_new')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-condition-option-very_good')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-condition-option-good')).toBeTruthy();
    expect(findByTestId(renderer!, 'listing-condition-option-acceptable')).toBeTruthy();
  });

  it('hides the condition AI badge when the user picks a different condition', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-condition-ai-badge')).toBeTruthy();

    await act(async () => {
      findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
    });

    expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();
  });

  describe('manual entry badges', () => {
    it('shows the title manual badge when there is no AI pre-fill and the field is empty', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(
        getTextContent(findByTestId(renderer!, 'listing-title-manual-badge').props.children),
      ).toBe('Enter manually');
    });

    it('hides the title manual badge when the user types a value', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
      });

      expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
    });

    it('restores the title manual badge when the user clears the field back to empty', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
      });

      expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('');
      });

      expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
    });

    it('keeps the title manual badge when the user types only whitespace', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('   ');
      });

      expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
    });

    it('does not show the title manual badge when initialValues provides a title', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
    });

    it('shows the category manual badge when there is no AI pre-fill', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(
        getTextContent(findByTestId(renderer!, 'listing-category-manual-badge').props.children),
      ).toBe('Enter manually');
    });

    it('hides the category manual badge when the user types a value', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Film Cameras');
      });

      expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
    });

    it('does not show the category manual badge when initialValues provides a category', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ category: 'Film Cameras' }} />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
    });

    it('shows the price manual badge when there is no AI pre-fill', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(
        getTextContent(findByTestId(renderer!, 'listing-price-manual-badge').props.children),
      ).toBe('Enter manually');
    });

    it('hides the price manual badge when the user enters a price', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('49.99');
      });

      expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
    });

    it('does not show the price manual badge when initialValues provides a price', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ price: '85' }} />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
    });

    it('shows the condition manual badge when there is no AI pre-fill', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(
        getTextContent(findByTestId(renderer!, 'listing-condition-manual-badge').props.children),
      ).toBe('Enter manually');
    });

    it('hides the condition manual badge when the user selects a condition', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      });

      expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
    });

    it('does not show the condition manual badge when initialValues provides a condition', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
    });

    it('shows no manual badges when all fields are AI pre-filled', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{
              title: 'Canon AE-1 35mm Film Camera',
              category: 'Film Cameras',
              condition: 'good',
              price: '85',
              description: 'A Canon AE-1 in good working condition.',
            }}
          />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
      expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
      expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
      expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
    });

    it('never shows both AI and manual badges simultaneously for the title field', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
        );
      });

      expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();
      expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
      expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
    });
  });

  describe('photo hosting', () => {
    it('appends Photo: {url} to the clipboard text when hostedPhotoUrl is provided', async () => {
      const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            hostedPhotoUrl="https://example.supabase.co/listing-photos/user-1/val-1.jpg"
          />,
        );
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(setStringSpy).toHaveBeenCalledWith(
        'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99\nPhoto: https://example.supabase.co/listing-photos/user-1/val-1.jpg',
      );
    });

    it('does not include a Photo line in the clipboard text when hostedPhotoUrl is absent', async () => {
      const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(setStringSpy).toHaveBeenLastCalledWith(
        'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99',
      );
    });

    it('places the Photo line after the Description line when description is present', async () => {
      const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            hostedPhotoUrl="https://example.supabase.co/photo.jpg"
          />,
        );
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        findByTestId(renderer!, 'listing-description-input').props.onChangeText('Film-tested.');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(setStringSpy).toHaveBeenCalledWith(
        'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99\nDescription: Film-tested.\nPhoto: https://example.supabase.co/photo.jpg',
      );
    });

    it('shows the upload status caption when photoUploadState is uploading', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            photoUri="file:///photo.jpg"
            photoUploadState="uploading"
          />,
        );
      });

      expect(getTextContent(findByTestId(renderer!, 'listing-photo-upload-status').props.children)).toBe(
        'Hosting photo for sharing...',
      );
    });

    it('shows the upload error caption when photoUploadState is error', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" photoUri="file:///photo.jpg" photoUploadState="error" />,
        );
      });

      expect(getTextContent(findByTestId(renderer!, 'listing-photo-upload-status').props.children)).toBe(
        'Photo upload failed — listing will copy without a photo URL',
      );
    });

    it('shows a retry control when photoUploadState is error and calls onRetryPhotoUpload', async () => {
      const handleRetryPhotoUpload = jest.fn();
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            photoUri="file:///photo.jpg"
            photoUploadState="error"
            onRetryPhotoUpload={handleRetryPhotoUpload}
          />,
        );
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-photo-upload-retry-button').props.onPress();
      });

      expect(handleRetryPhotoUpload).toHaveBeenCalledTimes(1);
    });

    it('shows no upload caption when photoUploadState is done', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" photoUri="file:///photo.jpg" photoUploadState="done" />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-photo-upload-status')).toThrow();
    });

    it('shows no upload caption when photoUploadState is not provided', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(() => findByTestId(renderer!, 'listing-photo-upload-status')).toThrow();
    });
  });

  it('shows the condition validation error when submitting without a condition selected', async () => {
    let renderer: ReactTestRenderer;
    const handleSubmit = jest.fn<void, [ListingFormValues]>();

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" onSubmit={handleSubmit} />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Test Title');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Electronics');
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('10.00');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Condition is required' })).toBeTruthy();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('visually highlights the pre-selected condition option', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
      );
    });

    expect(findByTestId(renderer!, 'listing-condition-option-good').props.className).toContain(
      'bg-ink',
    );
    expect(findByTestId(renderer!, 'listing-condition-option-new').props.className).toContain(
      'bg-paper',
    );
  });

  it('restores the condition AI badge when the user picks the original condition back', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
      );
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
    });

    expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();

    await act(async () => {
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
    });

    expect(findByTestId(renderer!, 'listing-condition-ai-badge')).toBeTruthy();
  });

  it('does not render the legacy condition text input', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    expect(() => findByTestId(renderer!, 'listing-condition-input')).toThrow();
  });

  it('shows price range caption when price is pre-filled and priceRange is provided', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ price: '249' }}
          priceRange={{ min: 100, max: 200 }}
        />,
      );
    });

    const caption = findByTestId(renderer!, 'listing-price-range-caption');

    expect(caption).toBeTruthy();
    expect(getTextContent(caption.props.children)).toBe('Estimated: $100–200');
  });

  it('does not show the price range caption when priceRange is absent', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm valuationId="valuation-1" initialValues={{ price: '249' }} />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow();
  });

  it('does not show the price range caption when priceRange is provided but price is not pre-filled', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ListingForm
          valuationId="valuation-1"
          initialValues={{ title: 'Canon AE-1' }}
          priceRange={{ min: 100, max: 200 }}
        />,
      );
    });

    expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow();
  });

  it('shows required-field validation errors on empty submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Title is required' })).toBeTruthy();
    expect(renderer!.root.findByProps({ children: 'Category is required' })).toBeTruthy();
    expect(renderer!.root.findByProps({ children: 'Condition is required' })).toBeTruthy();
    expect(renderer!.root.findByProps({ children: 'Price is required' })).toBeTruthy();
  });

  it('shows title max-length validation when the title exceeds the eBay limit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText(
        'A'.repeat(LISTING_TITLE_MAX_LENGTH + 1),
      );
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Title must be 80 characters or less' }),
    ).toBeTruthy();
  });

  it('submits valid listing values', async () => {
    let renderer: ReactTestRenderer;
    const handleSubmit = jest.fn<void, [ListingFormValues]>();

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" onSubmit={handleSubmit} />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1 35mm Camera');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
      findByTestId(renderer!, 'listing-description-input').props.onChangeText('Test description');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Canon AE-1 35mm Camera',
      category: 'Cameras',
      condition: 'good',
      price: '249.99',
      description: 'Test description',
    });
  });

  it('renders the CTA with the required accessibility label', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    const button = renderer!.root.findByProps({ testID: 'listing-submit-button' });
    expect(button.props.accessibilityLabel).toBe('Copy listing to clipboard');
  });

  it('copies formatted listing details to the clipboard and shows a success alert', async () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const handleSubmit = jest.fn<void, [ListingFormValues]>();
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" onSubmit={handleSubmit} />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
      findByTestId(renderer!, 'listing-description-input').props.onChangeText('Film-tested body');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(setStringSpy).toHaveBeenCalledWith(
      'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99\nDescription: Film-tested body',
    );
    expect(alertSpy).toHaveBeenCalledWith('Copied', 'Listing details copied to clipboard.');
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Canon AE-1',
      category: 'Cameras',
      condition: 'good',
      price: '249.99',
      description: 'Film-tested body',
    });
  });

  it('includes title, category, condition, and price in the clipboard text', async () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(setStringSpy).toHaveBeenCalledWith(
      'Title: Camera\nCategory: Cameras\nCondition: good\nPrice: $50.00',
    );
  });

  it('omits the description line when the description is blank', async () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
      findByTestId(renderer!, 'listing-description-input').props.onChangeText('   ');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(setStringSpy).toHaveBeenCalledWith(
      'Title: Camera\nCategory: Cameras\nCondition: good\nPrice: $50.00',
    );
  });

  it('formats condition value with spaces in the clipboard text', async () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(setStringSpy).toHaveBeenCalledWith(
      'Title: Camera\nCategory: Cameras\nCondition: like new\nPrice: $50.00',
    );
  });

  it('shows an error alert when clipboard write fails', async () => {
    jest.spyOn(Clipboard, 'setStringAsync').mockRejectedValueOnce(new Error('permission denied'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const handleSubmit = jest.fn<void, [ListingFormValues]>();
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ListingForm valuationId="valuation-1" onSubmit={handleSubmit} />);
    });

    await act(async () => {
      findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
      findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
      findByTestId(renderer!, 'listing-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(alertSpy).toHaveBeenCalledWith(
      'Copy failed',
      'Unable to copy to clipboard. Please try again.',
    );
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Camera',
      category: 'Cameras',
      condition: 'good',
      price: '50.00',
      description: '',
    });
  });
});