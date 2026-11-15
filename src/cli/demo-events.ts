import type { UsageEvent } from '../core';

const MS_PER_DAY = 86_400_000;
const MODELS = [
  { agentId: 'claude-code', model: 'claude-sonnet-4-5-20250929', share: 0.6 },
  { agentId: 'claude-code', model: 'claude-opus-4-5-20251101', share: 0.22 },
  { agentId: 'codex', model: 'gpt-5.1-codex', share: 0.18 },
] as const;

/** Small seeded generator, so the demo looks the same on every run. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Made-up usage for `--demo`: a busy year of an imaginary developer.
 * Covers the given year up to `now` (or the whole year, if it is over).
 */
export function createDemoEvents(year: number, now: Date): UsageEvent[] {
  const random = createRandom(42);
  const randomInt = (min: number, max: number) => Math.floor(min + random() * (max - min + 1));
  const yearStartMs = Date.UTC(year, 0, 1);
  const endMs = Math.min(now.getTime(), Date.UTC(year + 1, 0, 1) - 1);
  const dayCount = Math.max(1, Math.floor((endMs - yearStartMs) / MS_PER_DAY));
  const events: UsageEvent[] = [];

  for (let day = 0; day < dayCount; day += 1) {
    if (random() < 0.3) continue;
    // Usage grows over the year, and four evenings in ten run late.
    const callCount = Math.round(randomInt(8, 36) * (1 + day / 120));
    const startHour = random() < 0.4 ? randomInt(20, 23) : randomInt(8, 17);
    const sessionStartMs = yearStartMs + day * MS_PER_DAY + startHour * 3_600_000;
    const pick = random();
    const modelChoice =
      MODELS.find(
        (_, index) => pick < MODELS.slice(0, index + 1).reduce((sum, m) => sum + m.share, 0),
      ) ?? MODELS[0];

    for (let call = 0; call < callCount; call += 1) {
      events.push({
        eventId: `demo-${day}-${call}`,
        agentId: modelChoice.agentId,
        sessionId: `demo-session-${day}`,
        timestamp: new Date(sessionStartMs + call * randomInt(30_000, 240_000)),
        model: modelChoice.model,
        inputTokens: randomInt(20, 2_000),
        outputTokens: randomInt(100, 3_000),
        cacheReadTokens: randomInt(20_000, 140_000),
        cacheWriteTokens: randomInt(0, 8_000),
        projectHash: `demo-project-${day % 7}`,
      });
    }
  }
  return events;
}
