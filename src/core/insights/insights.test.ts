import { describe, expect, it } from 'vitest';
import { TEST_PRICE_TABLE, createEvent } from '../../../test/create-event';
import { computeStats } from '../stats/compute-stats';
import { buildInsights } from './build-insights';
import { formatCompactNumber, formatDay, formatDuration, formatUsd } from './format';
import { pickPersona } from './persona';

const OPTIONS = { year: 2026, timeZone: 'UTC', priceTable: TEST_PRICE_TABLE };
const at = (isoTime: string) => createEvent({ timestamp: new Date(isoTime) });

describe('format', () => {
  it('formats numbers the way the card shows them', () => {
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatCompactNumber(1_500)).toBe('1.5K');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
    expect(formatCompactNumber(1_234_000_000)).toBe('1.2B');
    expect(formatUsd(12.345)).toBe('$12.35');
    expect(formatUsd(1234.5)).toBe('$1,235');
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(150 * 60_000)).toBe('2h 30m');
    expect(formatDay('2026-03-09')).toBe('Mar 9');
  });
});

describe('pickPersona', () => {
  it('spots night owls, early birds and weekend warriors', () => {
    const nightOwl = computeStats(
      [at('2026-03-09T23:00:00Z'), at('2026-03-10T02:00:00Z')],
      OPTIONS,
    );
    expect(pickPersona(nightOwl).name).toBe('The Night Owl');

    const earlyBird = computeStats(
      [at('2026-03-09T06:00:00Z'), at('2026-03-10T07:00:00Z')],
      OPTIONS,
    );
    expect(pickPersona(earlyBird).name).toBe('The Early Bird');

    const weekendWarrior = computeStats(
      [at('2026-03-14T12:00:00Z'), at('2026-03-15T19:00:00Z')],
      OPTIONS,
    );
    expect(pickPersona(weekendWarrior).name).toBe('The Weekend Warrior');

    const nineToFiver = computeStats(
      [at('2026-03-09T10:00:00Z'), at('2026-03-10T15:00:00Z')],
      OPTIONS,
    );
    expect(pickPersona(nineToFiver).name).toBe('The Nine-to-Fiver');
  });
});

describe('buildInsights', () => {
  it('returns no cards without activity', () => {
    expect(buildInsights(computeStats([], OPTIONS))).toEqual([]);
  });

  it('builds cards with unique ids', () => {
    const stats = computeStats([at('2026-03-09T10:00:00Z'), at('2026-03-09T11:00:00Z')], OPTIONS);
    const insights = buildInsights(stats);
    const ids = insights.map((insight) => insight.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('total-tokens');
    expect(ids).toContain('persona');
    expect(insights.find((insight) => insight.id === 'longest-session')?.value).toBe('1h');
  });
});
