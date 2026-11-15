import { describe, expect, it } from 'vitest';
import { TEST_PRICE_TABLE, createEvent } from '../../../test/create-event';
import { computeStats } from '../stats/compute-stats';
import { buildInsights } from './build-insights';
import { describePeriod } from './period';
import { buildShareText } from './share-text';

const OPTIONS = { year: 2026, timeZone: 'UTC', priceTable: TEST_PRICE_TABLE };
const statsFor = (...isoDays: string[]) =>
  computeStats(
    isoDays.map((day) => createEvent({ timestamp: new Date(`${day}T12:00:00Z`) })),
    OPTIONS,
  );

describe('describePeriod', () => {
  it('speaks of the year when the data covers a long time', () => {
    expect(describePeriod(statsFor('2026-01-10', '2026-11-15'))).toMatchObject({
      isPartial: false,
      dayCount: 310,
      title: '2026',
      headline: 'My 2026 with AI agents',
      range: 'Jan 10 - Nov 15',
    });
  });

  it('speaks of days when only a few weeks of logs exist', () => {
    expect(describePeriod(statsFor('2026-10-17', '2026-11-15'))).toMatchObject({
      isPartial: true,
      dayCount: 30,
      title: '30 days',
      headline: 'My 30 days with AI agents',
      range: 'Oct 17 - Nov 15',
    });
  });

  it('handles a single day and no activity', () => {
    expect(describePeriod(statsFor('2026-03-09'))).toMatchObject({
      title: '1 day',
      range: 'Mar 9',
    });
    expect(describePeriod(statsFor())).toMatchObject({
      isPartial: false,
      title: '2026',
      range: '',
    });
  });
});

describe('buildShareText', () => {
  it('uses the real numbers and the honest time span', () => {
    const text = buildShareText(statsFor('2026-10-17', '2026-11-15'));
    expect(text).toContain('burned 300 tokens in 30 days.');
    expect(text).toContain('npx agentic-wrapped #AgenticWrapped');
    expect(buildShareText(statsFor('2026-01-10', '2026-11-15'))).toContain('in 2026.');
  });

  it('leaves out the price when most tokens have no known price', () => {
    const stats = computeStats(
      [createEvent({ model: 'mystery', outputTokens: 9000 }), createEvent({ outputTokens: 100 })],
      OPTIONS,
    );
    expect(stats.totals.costUsd).toBeGreaterThan(0);
    expect(stats.pricedTokenShare).toBeLessThan(0.1);
    expect(buildShareText(stats)).not.toContain('API prices');
    expect(buildInsights(stats).map((insight) => insight.id)).not.toContain('cost');
  });

  it('leaves out the price when no model has a known price', () => {
    const stats = computeStats([createEvent({ model: 'mystery' })], OPTIONS);
    expect(buildShareText(stats)).not.toContain('API prices');
  });
});
