import type { UsageEvent } from './usage-event';

export interface NormalizeOptions {
  year: number;
  /** IANA time zone used to decide which year an event belongs to. */
  timeZone: string;
}

export interface NormalizeResult {
  events: UsageEvent[];
  duplicateCount: number;
  invalidCount: number;
  outOfRangeCount: number;
}

const TOKEN_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
] as const;

function isValidEvent(event: UsageEvent): boolean {
  if (Number.isNaN(event.timestamp.getTime())) return false;
  if (event.model.length === 0 || event.sessionId.length === 0) return false;
  return TOKEN_FIELDS.every((field) => Number.isFinite(event[field]) && event[field] >= 0);
}

/** Drops invalid events, duplicates and events outside the requested year. Sorts by time. */
export function normalizeEvents(
  rawEvents: Iterable<UsageEvent>,
  options: NormalizeOptions,
): NormalizeResult {
  const yearFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: options.timeZone,
    year: 'numeric',
  });
  const seenEventIds = new Set<string>();
  const events: UsageEvent[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;
  let outOfRangeCount = 0;

  for (const event of rawEvents) {
    if (!isValidEvent(event)) {
      invalidCount += 1;
      continue;
    }
    if (Number(yearFormat.format(event.timestamp)) !== options.year) {
      outOfRangeCount += 1;
      continue;
    }
    const dedupeKey = `${event.agentId}:${event.eventId}`;
    if (seenEventIds.has(dedupeKey)) {
      duplicateCount += 1;
      continue;
    }
    seenEventIds.add(dedupeKey);
    events.push(event);
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return { events, duplicateCount, invalidCount, outOfRangeCount };
}
