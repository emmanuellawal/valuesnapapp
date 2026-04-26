import {
  transformConfidenceData,
  transformIdentifiers,
  transformItemDetails,
  transformMarketData,
  transformValuationResponse,
} from '@/types/transformers';

describe('transformIdentifiers', () => {
  it('maps backend identifier keys to frontend keys', () => {
    expect(
      transformIdentifiers({
        UPC: '012345678901',
        model_number: 'AE-1',
        serial_number: '12345',
      })
    ).toEqual({
      upc: '012345678901',
      modelNumber: 'AE-1',
      serialNumber: '12345',
    });
  });

  it('normalizes null and missing identifier fields', () => {
    expect(
      transformIdentifiers({
        UPC: null,
      })
    ).toEqual({
      upc: null,
      modelNumber: null,
      serialNumber: null,
    });
  });
});

describe('transformItemDetails', () => {
  const baseIdentity = {
    item_type: 'Vintage Camera',
    brand: 'Canon',
    model: 'AE-1',
    visual_condition: 'used_good',
    condition_details: 'Minor wear on corners',
    estimated_age: '1976',
    category_hint: 'Film Cameras',
    search_keywords: ['Canon AE-1', 'film camera'],
    description: 'Solid film SLR in good working order.',
    identifiers: {
      UPC: '012345678901',
      model_number: 'AE-1',
      serial_number: '12345',
    },
  };

  it.each([
    ['LIKE_NEW', 'used_excellent'],
    ['Excellent Condition', 'used_excellent'],
    ['acceptable', 'used_fair'],
    ['used_good', 'used_good'],
  ])('fuzzy-maps visual condition %s to %s', (input, expected) => {
    expect(
      transformItemDetails({
        ...baseIdentity,
        visual_condition: input,
      }).visualCondition
    ).toBe(expected);
  });

  it('falls back to used_good for unknown visual conditions', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(
      transformItemDetails({
        ...baseIdentity,
        visual_condition: 'broken',
      }).visualCondition
    ).toBe('used_good');

    expect(warnSpy).toHaveBeenCalledWith(
      'Unknown visual condition: "broken", defaulting to "used_good"'
    );
    warnSpy.mockRestore();
  });

  it('maps the full item identity shape to camelCase keys', () => {
    expect(transformItemDetails(baseIdentity)).toEqual({
      itemType: 'Vintage Camera',
      brand: 'Canon',
      model: 'AE-1',
      visualCondition: 'used_good',
      conditionDetails: 'Minor wear on corners',
      estimatedAge: '1976',
      categoryHint: 'Film Cameras',
      searchKeywords: ['Canon AE-1', 'film camera'],
      description: 'Solid film SLR in good working order.',
      identifiers: {
        upc: '012345678901',
        modelNumber: 'AE-1',
        serialNumber: '12345',
      },
    });
  });

  it('maps description field and defaults to empty string when missing', () => {
    const withDescription = transformItemDetails({
      ...baseIdentity,
      description: 'A 1976 Canon AE-1 SLR.',
    });

    expect(withDescription.description).toBe('A 1976 Canon AE-1 SLR.');

    const { description: _description, ...withoutDescription } = baseIdentity;

    expect(transformItemDetails(withoutDescription).description).toBe('');
  });
});

describe('transformMarketData', () => {
  it('maps market data fields and price range', () => {
    expect(
      transformMarketData({
        status: 'success',
        keywords: 'Canon AE-1 film camera',
        total_found: 12,
        prices_analyzed: 9,
        outliers_removed: 1,
        price_range: { min: 80, max: 140 },
        fair_market_value: 110,
        mean: 112,
        std_dev: 14,
        avg_days_to_sell: 11,
        confidence: 'HIGH',
        message: 'Based on recent listings',
      })
    ).toEqual({
      status: 'success',
      keywords: 'Canon AE-1 film camera',
      totalFound: 12,
      pricesAnalyzed: 9,
      outliersRemoved: 1,
      priceRange: { min: 80, max: 140 },
      fairMarketValue: 110,
      mean: 112,
      stdDev: 14,
      avgDaysToSell: 11,
      confidence: 'HIGH',
      message: 'Based on recent listings',
    });
  });

  it('treats null price_range as undefined and preserves no_data status', () => {
    expect(
      transformMarketData({
        status: 'no_data',
        keywords: 'rare camera',
        total_found: 0,
        price_range: null,
        confidence: 'NONE',
      })
    ).toEqual({
      status: 'no_data',
      keywords: 'rare camera',
      totalFound: 0,
      pricesAnalyzed: undefined,
      outliersRemoved: undefined,
      priceRange: undefined,
      fairMarketValue: undefined,
      mean: undefined,
      stdDev: undefined,
      avgDaysToSell: undefined,
      confidence: 'NONE',
      message: undefined,
    });
  });
});

describe('transformConfidenceData', () => {
  it('maps nested confidence data fields', () => {
    expect(
      transformConfidenceData({
        market_confidence: 'HIGH',
        confidence_factors: {
          sample_size: 9,
          variance_pct: 13.4,
          ai_confidence: 'HIGH',
          data_source: 'ebay',
          data_source_penalty: false,
        },
        ai_only_flag: false,
        confidence_message: 'Based on 9 listings',
      })
    ).toEqual({
      marketConfidence: 'HIGH',
      aiConfidence: 'HIGH',
      sampleSize: 9,
      priceVariance: 13.4,
      dataSource: 'ebay',
      dataSourcePenalty: false,
      aiOnlyFlag: false,
      message: 'Based on 9 listings',
    });
  });

  it('returns safe defaults when the full payload is null (HIGH-4 regression)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(transformConfidenceData(null)).toEqual({
      marketConfidence: 'LOW',
      aiConfidence: 'LOW',
      sampleSize: 0,
      priceVariance: 0,
      dataSource: 'unknown',
      dataSourcePenalty: false,
      aiOnlyFlag: false,
      message: '',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'transformConfidenceData: missing confidence payload, using LOW fallback'
    );
    warnSpy.mockRestore();
  });

  it('falls back to safe defaults when confidence_factors is absent (HIGH-4 regression)', () => {
    expect(
      transformConfidenceData({
        market_confidence: 'MEDIUM',
        ai_only_flag: true,
        confidence_message: 'AI-only flag set',
      })
    ).toEqual({
      marketConfidence: 'MEDIUM',
      aiConfidence: 'LOW',
      sampleSize: 0,
      priceVariance: 0,
      dataSource: 'unknown',
      dataSourcePenalty: false,
      aiOnlyFlag: true,
      message: 'AI-only flag set',
    });
  });
});

describe('transformValuationResponse', () => {
  const fullResponse = {
    // This fixture uses the real backend key "identity".
    // If the transformer ever expects "item_identity" again, these assertions fail.
    identity: {
      item_type: 'Vintage Camera',
      brand: 'Canon',
      model: 'AE-1',
      visual_condition: 'LIKE_NEW',
      condition_details: 'Clean body and lens',
      estimated_age: '1976',
      category_hint: 'Film Cameras',
      search_keywords: ['Canon AE-1', 'film camera'],
      description: 'Clean vintage Canon AE-1 film camera with bright lens and tested controls.',
      identifiers: {
        UPC: '012345678901',
        model_number: 'AE-1',
        serial_number: '12345',
      },
    },
    valuation: {
      status: 'success',
      keywords: 'Canon AE-1 film camera',
      total_found: 12,
      prices_analyzed: 9,
      outliers_removed: 1,
      price_range: { min: 80, max: 140 },
      fair_market_value: 110,
      mean: 112,
      std_dev: 14,
      avg_days_to_sell: 11,
      confidence: 'HIGH',
      message: 'Based on recent listings',
    },
    confidence: {
      market_confidence: 'HIGH',
      confidence_factors: {
        sample_size: 9,
        variance_pct: 13.4,
        ai_confidence: 'HIGH',
        data_source: 'ebay',
        data_source_penalty: false,
      },
      ai_only_flag: false,
      confidence_message: 'Based on 9 listings',
    },
    valuation_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('transforms the real backend appraise response shape', () => {
    expect(transformValuationResponse(fullResponse)).toEqual({
      itemDetails: {
        itemType: 'Vintage Camera',
        brand: 'Canon',
        model: 'AE-1',
        visualCondition: 'used_excellent',
        conditionDetails: 'Clean body and lens',
        estimatedAge: '1976',
        categoryHint: 'Film Cameras',
        searchKeywords: ['Canon AE-1', 'film camera'],
        description: 'Clean vintage Canon AE-1 film camera with bright lens and tested controls.',
        identifiers: {
          upc: '012345678901',
          modelNumber: 'AE-1',
          serialNumber: '12345',
        },
      },
      marketData: {
        status: 'success',
        keywords: 'Canon AE-1 film camera',
        totalFound: 12,
        pricesAnalyzed: 9,
        outliersRemoved: 1,
        priceRange: { min: 80, max: 140 },
        fairMarketValue: 110,
        mean: 112,
        stdDev: 14,
        avgDaysToSell: 11,
        confidence: 'HIGH',
        message: 'Based on recent listings',
      },
      confidence: {
        marketConfidence: 'HIGH',
        aiConfidence: 'HIGH',
        sampleSize: 9,
        priceVariance: 13.4,
        dataSource: 'ebay',
        dataSourcePenalty: false,
        aiOnlyFlag: false,
        message: 'Based on 9 listings',
      },
      valuationId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('maps null valuation_id to null', () => {
    expect(
      transformValuationResponse({
        ...fullResponse,
        valuation_id: null,
      }).valuationId
    ).toBeNull();
  });

  it('maps null valuation price_range to undefined', () => {
    expect(
      transformValuationResponse({
        ...fullResponse,
        valuation: {
          ...fullResponse.valuation,
          price_range: null,
        },
      }).marketData.priceRange
    ).toBeUndefined();
  });

  it('derives market confidence from the top-level confidence payload when valuation omits it', () => {
    const { confidence: _legacyConfidence, ...liveValuation } = fullResponse.valuation;

    expect(
      transformValuationResponse({
        ...fullResponse,
        valuation: liveValuation,
        confidence: {
          ...fullResponse.confidence,
          market_confidence: 'LOW',
        },
      }).marketData.confidence
    ).toBe('LOW');
  });

  it('prefers the canonical top-level confidence when both shapes are present (HIGH-3 follow-up)', () => {
    expect(
      transformValuationResponse({
        ...fullResponse,
        valuation: {
          ...fullResponse.valuation,
          confidence: 'HIGH',
        },
        confidence: {
          ...fullResponse.confidence,
          market_confidence: 'LOW',
        },
      }).marketData.confidence
    ).toBe('LOW');
  });

  it('does not crash when the backend omits the confidence payload entirely (HIGH-4 regression)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { confidence: _legacyConfidence, ...liveValuation } = fullResponse.valuation;
    const result = transformValuationResponse({
      ...fullResponse,
      valuation: liveValuation,
      confidence: null,
    });

    expect(result.marketData.confidence).toBe('LOW');
    expect(result.confidence).toEqual({
      marketConfidence: 'LOW',
      aiConfidence: 'LOW',
      sampleSize: 0,
      priceVariance: 0,
      dataSource: 'unknown',
      dataSourcePenalty: false,
      aiOnlyFlag: false,
      message: '',
    });

    warnSpy.mockRestore();
  });
});
