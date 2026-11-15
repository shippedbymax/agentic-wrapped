import { describe, expect, it } from 'vitest';
import { TEST_PRICE_TABLE, createEvent } from '../../../test/create-event';
import { computeStats } from './compute-stats';
import { computeLongestStreak } from './local-time';

const OPTIONS = { year: 2026, timeZone: 'UTC', priceTable: TEST_PRICE_TABLE };

describe('computeStats', () => {
  it('returns zeros for no events', () => {
    const stats = computeStats([], OPTIONS);
    expect(stats.totals.totalTokens).toBe(0);
    expect(stats.cacheHitRate).toBe(0);
    expect(stats.busiestDay).toBeUndefined();
    expect(stats.longestSession).toBeUndefined();
  });

  it('adds up tokens, cost, sessions, agents and models', () => {
    const stats = computeStats(
      [
        createEvent({ sessionId: 'a', inputTokens: 100, outputTokens: 50, projectHash: 'p1' }),
        createEvent({ sessionId: 'a', inputTokens: 0, outputTokens: 10, cacheReadTokens: 300 }),
        createEvent({
          sessionId: 'b',
          agentId: 'codex',
          model: 'mystery',
          inputTokens: 1000,
          outputTokens: 0,
          projectHash: 'p2',
        }),
      ],
      OPTIONS,
    );
    expect(stats.totals.totalTokens).toBe(100 + 50 + 10 + 300 + 1000);
    expect(stats.totals.costUsd).toBeCloseTo(100e-6 + 60 * 2e-6 + 300e-7, 9);
    expect(stats.sessionCount).toBe(2);
    expect(stats.projectCount).toBe(2);
    expect(stats.agents.map((agent) => agent.agentId)).toEqual(['codex', 'claude-code']);
    expect(stats.agents[1]?.sessionCount).toBe(1);
    expect(stats.models[0]?.model).toBe('mystery');
    expect(stats.unpricedModels).toEqual(['mystery']);
    expect(stats.cacheHitRate).toBeCloseTo(300 / 1400, 6);
  });

  it('finds the longest session, busiest day and time buckets', () => {
    const stats = computeStats(
      [
        createEvent({ sessionId: 'short', timestamp: new Date('2026-03-09T09:00:00Z') }),
        createEvent({ sessionId: 'long', timestamp: new Date('2026-03-10T22:00:00Z') }),
        createEvent({
          sessionId: 'long',
          timestamp: new Date('2026-03-10T23:30:00Z'),
          outputTokens: 5000,
        }),
      ],
      OPTIONS,
    );
    expect(stats.longestSession).toMatchObject({ durationMs: 90 * 60_000, date: '2026-03-10' });
    expect(stats.busiestDay?.date).toBe('2026-03-10');
    expect(stats.eventsByHour[9]).toBe(1);
    expect(stats.eventsByHour[23]).toBe(1);
    expect(stats.eventsByWeekday[0]).toBe(1); // 2026-03-09 is a Monday
    expect(stats.eventsByWeekday[1]).toBe(2);
    expect(stats.tokensByMonth[2]).toBe(stats.totals.totalTokens);
    expect(stats.activeDayCount).toBe(2);
    expect(stats.longestStreakDays).toBe(2);
  });

  it('buckets days in the given time zone', () => {
    const lateEvening = createEvent({ timestamp: new Date('2026-03-09T23:30:00Z') });
    const stats = computeStats([lateEvening], { ...OPTIONS, timeZone: 'Europe/Berlin' });
    expect(stats.busiestDay?.date).toBe('2026-03-10');
    expect(stats.eventsByHour[0]).toBe(1);
  });
});

describe('computeLongestStreak', () => {
  it('counts consecutive days across month ends and ignores duplicates', () => {
    expect(computeLongestStreak([])).toBe(0);
    expect(
      computeLongestStreak(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-01', '2026-02-05']),
    ).toBe(3);
  });
});
