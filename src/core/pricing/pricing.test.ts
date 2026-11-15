import { describe, expect, it } from 'vitest';
import { TEST_PRICE_TABLE, createEvent } from '../../../test/create-event';
import { computeCostUsd } from './compute-cost';
import { DEFAULT_PRICE_TABLE, findModelPrice } from './price-table';

describe('findModelPrice', () => {
  const table = { ...TEST_PRICE_TABLE, 'test-model-mini': TEST_PRICE_TABLE['test-model'] };

  it('finds exact names, ignoring provider prefix, suffix and case', () => {
    expect(findModelPrice('test-model', table)).toBeDefined();
    expect(findModelPrice('vendor/Test-Model[1m]', table)).toBeDefined();
  });

  it('resolves dated versions to the longest matching family', () => {
    expect(findModelPrice('test-model-mini-20260101', table)).toBe(table['test-model-mini']);
  });

  it('does not match a different model that only shares leading letters', () => {
    expect(findModelPrice('test-modelx', table)).toBeUndefined();
    expect(findModelPrice('other', table)).toBeUndefined();
  });

  it('ships a non-empty default table with sane prices', () => {
    const prices = Object.values(DEFAULT_PRICE_TABLE);
    expect(prices.length).toBeGreaterThan(20);
    for (const price of prices) {
      expect(price.inputUsdPerToken).toBeGreaterThan(0);
      expect(price.outputUsdPerToken).toBeGreaterThan(0);
    }
  });
});

describe('computeCostUsd', () => {
  it('prices every token kind', () => {
    const event = createEvent({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    });
    expect(computeCostUsd(event, TEST_PRICE_TABLE)).toBeCloseTo(1 + 2 + 0.1 + 1.25, 6);
  });

  it('returns undefined for unknown models', () => {
    expect(computeCostUsd(createEvent({ model: 'mystery' }), TEST_PRICE_TABLE)).toBeUndefined();
  });
});
