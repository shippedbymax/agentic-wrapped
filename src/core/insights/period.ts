import type { WrappedStats } from '../stats/wrapped-stats';
import { formatDay } from './format';

/**
 * Up to this many days of data, the output says "N days" instead of the year.
 * Agents delete old logs (Claude Code after 30 days by default), so many people only
 * have a few weeks on disk. Calling that "your year" would be a lie.
 */
const PARTIAL_PERIOD_MAX_DAYS = 45;
const MS_PER_DAY = 86_400_000;

/** The time span the report really covers, in words. */
export interface Period {
  /** True when the data covers only a short part of the year. */
  isPartial: boolean;
  /** Days from the first to the last active day, both included. */
  dayCount: number;
  /** The big word: `2026` or `30 days`. */
  title: string;
  /** `My 2026 with AI agents` or `My 30 days with AI agents`. */
  headline: string;
  /** `Oct 17 - Nov 15`, or an empty string without activity. */
  range: string;
}

export function describePeriod(stats: WrappedStats): Period {
  const { firstActiveDate, lastActiveDate } = stats;
  if (!firstActiveDate || !lastActiveDate) {
    const title = String(stats.year);
    return {
      isPartial: false,
      dayCount: 0,
      title,
      headline: `My ${title} with AI agents`,
      range: '',
    };
  }

  const spanMs =
    Date.parse(`${lastActiveDate}T00:00:00Z`) - Date.parse(`${firstActiveDate}T00:00:00Z`);
  const dayCount = Math.round(spanMs / MS_PER_DAY) + 1;
  const isPartial = dayCount <= PARTIAL_PERIOD_MAX_DAYS;
  const title = isPartial ? `${dayCount} ${dayCount === 1 ? 'day' : 'days'}` : String(stats.year);
  const range =
    firstActiveDate === lastActiveDate
      ? formatDay(firstActiveDate)
      : `${formatDay(firstActiveDate)} - ${formatDay(lastActiveDate)}`;
  return { isPartial, dayCount, title, headline: `My ${title} with AI agents`, range };
}
