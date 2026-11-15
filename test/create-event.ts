import type { UsageEvent } from '../src/core';

let nextEventNumber = 0;

/** Test helper: a valid event with sensible defaults. */
export function createEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  nextEventNumber += 1;
  return {
    eventId: `event-${nextEventNumber}`,
    agentId: 'claude-code',
    sessionId: 'session-1',
    timestamp: new Date('2026-03-09T12:00:00Z'),
    model: 'test-model',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...overrides,
  };
}

export const TEST_PRICE_TABLE = {
  'test-model': {
    inputUsdPerToken: 0.000001,
    outputUsdPerToken: 0.000002,
    cacheReadUsdPerToken: 0.0000001,
    cacheWriteUsdPerToken: 0.00000125,
  },
};
