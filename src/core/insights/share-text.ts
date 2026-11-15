import type { WrappedStats } from '../stats/wrapped-stats';
import { formatCompactNumber, formatUsd } from './format';
import { describePeriod } from './period';

export const SHARE_HASHTAG = '#AgentWrapped';

/** A ready-to-post text with the user's headline numbers. */
export function buildShareText(stats: WrappedStats): string {
  const period = describePeriod(stats);
  const span = period.isPartial ? `in ${period.title}` : `in ${stats.year}`;
  const lines = [
    `My AI coding agents burned ${formatCompactNumber(stats.totals.totalTokens)} tokens ${span}.`,
  ];
  if (stats.totals.costUsd > 0) {
    lines.push(`At API prices that is ${formatUsd(stats.totals.costUsd)}.`);
  }
  lines.push('', "What's your number?", '', `npx agent-wrapped ${SHARE_HASHTAG}`);
  return lines.join('\n');
}
