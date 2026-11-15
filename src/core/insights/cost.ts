import type { WrappedStats } from '../stats/wrapped-stats';

/**
 * Below this share of priced tokens, the dollar value is not shown as a headline:
 * a number that covers a small part of the usage would look precise and be wrong.
 */
const MIN_PRICED_TOKEN_SHARE = 0.9;

/** True when the total cost is worth showing as "your API value". */
export function isCostReliable(stats: WrappedStats): boolean {
  return stats.totals.costUsd > 0 && stats.pricedTokenShare >= MIN_PRICED_TOKEN_SHARE;
}
