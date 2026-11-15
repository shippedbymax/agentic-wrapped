import { describe, expect, it } from 'vitest';
import { createEvent } from '../../../test/create-event';
import { normalizeEvents } from './normalize-events';

const OPTIONS = { year: 2026, timeZone: 'UTC' };

describe('normalizeEvents', () => {
  it('drops duplicates by agent and event id', () => {
    const event = createEvent({ eventId: 'same' });
    const result = normalizeEvents([event, { ...event }], OPTIONS);
    expect(result.events).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it('keeps the most complete copy of a duplicated event', () => {
    const partial = createEvent({ eventId: 'same', outputTokens: 10 });
    const complete = { ...partial, outputTokens: 900 };
    for (const order of [
      [partial, complete],
      [complete, partial],
    ]) {
      expect(normalizeEvents(order, OPTIONS).events).toEqual([complete]);
    }
  });

  it('keeps the same event id from two different agents', () => {
    const result = normalizeEvents(
      [createEvent({ eventId: 'same' }), createEvent({ eventId: 'same', agentId: 'codex' })],
      OPTIONS,
    );
    expect(result.events).toHaveLength(2);
  });

  it('drops invalid events instead of throwing', () => {
    const result = normalizeEvents(
      [
        createEvent({ timestamp: new Date('nope') }),
        createEvent({ inputTokens: -1 }),
        createEvent({ outputTokens: Number.NaN }),
        createEvent({ model: '' }),
      ],
      OPTIONS,
    );
    expect(result.events).toHaveLength(0);
    expect(result.invalidCount).toBe(4);
  });

  it('decides the year in the given time zone', () => {
    const newYearsEveUtc = createEvent({ timestamp: new Date('2025-12-31T23:30:00Z') });
    expect(normalizeEvents([newYearsEveUtc], OPTIONS).outOfRangeCount).toBe(1);
    expect(
      normalizeEvents([newYearsEveUtc], { year: 2026, timeZone: 'Europe/Berlin' }).events,
    ).toHaveLength(1);
  });

  it('sorts events by time', () => {
    const later = createEvent({ timestamp: new Date('2026-05-01T00:00:00Z') });
    const earlier = createEvent({ timestamp: new Date('2026-01-01T00:00:00Z') });
    expect(normalizeEvents([later, earlier], OPTIONS).events).toEqual([earlier, later]);
  });
});
