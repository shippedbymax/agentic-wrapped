import type { WrappedStats } from '../stats/wrapped-stats';
import { isCostReliable } from './cost';
import {
  formatAgentName,
  formatCompactNumber,
  formatDay,
  formatDuration,
  formatModelName,
  formatPercent,
  formatUsd,
} from './format';
import type { Insight } from './insight';
import { pickPersona } from './persona';

/** `1 day`, `2 days`, `1,234 sessions`. */
function pluralize(count: number, noun: string): string {
  return `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;
}

type InsightRule = (stats: WrappedStats) => Insight | undefined;

/** Agents like Cursor log no token counts. Then the report counts replies instead. */
const hasTokens = (stats: WrappedStats) => stats.totals.totalTokens > 0;

const describeActivity = (stats: WrappedStats) =>
  `across ${pluralize(stats.sessionCount, 'session')} on ${pluralize(stats.activeDayCount, 'day')}`;

const totalTokensInsight: InsightRule = (stats) => {
  if (!hasTokens(stats)) return undefined;
  return {
    id: 'total-tokens',
    title: 'Total tokens',
    value: formatCompactNumber(stats.totals.totalTokens),
    detail: describeActivity(stats),
  };
};

const repliesInsight: InsightRule = (stats) => {
  if (hasTokens(stats)) return undefined;
  return {
    id: 'ai-replies',
    title: 'AI replies',
    value: formatCompactNumber(stats.totals.eventCount),
    detail: describeActivity(stats),
  };
};

const costInsight: InsightRule = (stats) => {
  if (!isCostReliable(stats)) return undefined;
  return {
    id: 'cost',
    title: 'API value',
    value: formatUsd(stats.totals.costUsd),
    detail: 'at API list prices',
  };
};

const favoriteModelInsight: InsightRule = (stats) => {
  const favorite = stats.models[0];
  if (!favorite) return undefined;
  const share = hasTokens(stats)
    ? `${formatPercent(favorite.totalTokens / stats.totals.totalTokens)} of all tokens`
    : `${formatPercent(favorite.eventCount / stats.totals.eventCount)} of all replies`;
  return {
    id: 'favorite-model',
    title: 'Favorite model',
    value: formatModelName(favorite.model),
    detail: share,
  };
};

const favoriteAgentInsight: InsightRule = (stats) => {
  const favorite = stats.agents[0];
  if (!favorite) return undefined;
  return {
    id: 'favorite-agent',
    title: 'Favorite agent',
    value: formatAgentName(favorite.agentId),
    detail: pluralize(favorite.sessionCount, 'session'),
  };
};

const longestSessionInsight: InsightRule = (stats) => {
  const session = stats.longestSession;
  if (!session || session.durationMs === 0) return undefined;
  return {
    id: 'longest-session',
    title: 'Longest session',
    value: formatDuration(session.durationMs),
    detail: `on ${formatDay(session.date)} with ${formatAgentName(session.agentId)}`,
  };
};

const streakInsight: InsightRule = (stats) => ({
  id: 'streak',
  title: 'Longest streak',
  value: pluralize(stats.longestStreakDays, 'day'),
  detail: 'in a row',
});

const busiestDayInsight: InsightRule = (stats) => {
  const day = stats.busiestDay;
  if (!day) return undefined;
  return {
    id: 'busiest-day',
    title: 'Busiest day',
    value: formatDay(day.date),
    detail: hasTokens(stats)
      ? `${formatCompactNumber(day.totalTokens)} tokens in one day`
      : `${day.eventCount.toLocaleString('en-US')} ${day.eventCount === 1 ? 'reply' : 'replies'} in one day`,
  };
};

const cacheInsight: InsightRule = (stats) => {
  if (stats.totals.cacheReadTokens === 0) return undefined;
  return {
    id: 'cache-hit-rate',
    title: 'Cache hit rate',
    value: formatPercent(stats.cacheHitRate),
    detail: 'of input came from cache',
  };
};

const personaInsight: InsightRule = (stats) => {
  const persona = pickPersona(stats);
  return { id: 'persona', title: 'Your type', value: persona.name, detail: persona.reason };
};

/** Order here is the order on the card. Add a new card by adding a rule. */
const INSIGHT_RULES: readonly InsightRule[] = [
  totalTokensInsight,
  repliesInsight,
  costInsight,
  favoriteModelInsight,
  favoriteAgentInsight,
  longestSessionInsight,
  streakInsight,
  busiestDayInsight,
  cacheInsight,
  personaInsight,
];

/** Turns stats into cards. Returns an empty list when there was no activity. */
export function buildInsights(stats: WrappedStats): Insight[] {
  if (stats.totals.eventCount === 0) return [];
  return INSIGHT_RULES.map((rule) => rule(stats)).filter(
    (insight): insight is Insight => insight !== undefined,
  );
}
