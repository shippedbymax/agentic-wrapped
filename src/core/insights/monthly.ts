import type { WrappedStats } from '../stats/wrapped-stats';

/** The month-by-month chart: tokens when the logs have them, replies otherwise. */
export interface MonthlyActivity {
  title: string;
  /** One value per month, index 0 = January. */
  values: number[];
}

export function describeMonthlyActivity(stats: WrappedStats): MonthlyActivity {
  return stats.totals.totalTokens > 0
    ? { title: 'Tokens by month', values: stats.tokensByMonth }
    : { title: 'Replies by month', values: stats.eventsByMonth };
}
