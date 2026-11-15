import type { UsageEvent } from '../events/usage-event';
import { type PriceTable, findModelPrice } from './price-table';

/**
 * API list-price value of one event in USD.
 * Returns `undefined` when the model has no known price, so callers can report it
 * instead of silently counting it as free.
 */
export function computeCostUsd(event: UsageEvent, priceTable: PriceTable): number | undefined {
  const price = findModelPrice(event.model, priceTable);
  if (!price) return undefined;
  return (
    event.inputTokens * price.inputUsdPerToken +
    event.outputTokens * price.outputUsdPerToken +
    event.cacheReadTokens * price.cacheReadUsdPerToken +
    event.cacheWriteTokens * price.cacheWriteUsdPerToken
  );
}
