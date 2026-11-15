import snapshot from './model-prices.json';

export interface ModelPrice {
  inputUsdPerToken: number;
  outputUsdPerToken: number;
  cacheReadUsdPerToken: number;
  cacheWriteUsdPerToken: number;
}

export type PriceTable = Readonly<Record<string, ModelPrice>>;

/** Bundled snapshot. Refresh with `npm run update-pricing`. */
export const DEFAULT_PRICE_TABLE: PriceTable = snapshot.prices;
export const PRICE_TABLE_UPDATED_AT: string = snapshot.updatedAt;

/** `anthropic/claude-x` -> `claude-x`, `claude-x[1m]` -> `claude-x`. */
function toCanonicalModelName(model: string): string {
  const withoutProvider = model.slice(model.lastIndexOf('/') + 1);
  return withoutProvider.replace(/\[.*\]$/, '').toLowerCase();
}

/**
 * Finds the price for a model name.
 * Order: exact match, then the longest known name that is a prefix of the model
 * (so dated versions like `claude-sonnet-4-5-20250929` resolve to their family).
 */
export function findModelPrice(model: string, priceTable: PriceTable): ModelPrice | undefined {
  const canonicalName = toCanonicalModelName(model);
  const exactMatch = priceTable[canonicalName];
  if (exactMatch) return exactMatch;

  let bestPrefix = '';
  for (const knownName of Object.keys(priceTable)) {
    const isPrefix = canonicalName.startsWith(`${knownName}-`);
    if (isPrefix && knownName.length > bestPrefix.length) bestPrefix = knownName;
  }
  return bestPrefix ? priceTable[bestPrefix] : undefined;
}
