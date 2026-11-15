import { type NormalizeResult, normalizeEvents } from './events/normalize-events';
import type { UsageEvent } from './events/usage-event';
import { buildInsights } from './insights/build-insights';
import type { WrappedReport } from './ports';
import type { PriceTable } from './pricing/price-table';
import { computeStats } from './stats/compute-stats';

export interface BuildReportOptions {
  year: number;
  timeZone: string;
  priceTable: PriceTable;
}

export interface BuildReportResult {
  report: WrappedReport;
  dropped: Omit<NormalizeResult, 'events'>;
}

/** The whole core pipeline: normalize -> price -> aggregate -> insights. */
export function buildReport(
  rawEvents: Iterable<UsageEvent>,
  options: BuildReportOptions,
): BuildReportResult {
  const { events, ...dropped } = normalizeEvents(rawEvents, options);
  const stats = computeStats(events, options);
  return { report: { stats, insights: buildInsights(stats) }, dropped };
}
