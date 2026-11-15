import type { AgentId, UsageEvent } from '../events/usage-event';
import { computeCostUsd } from '../pricing/compute-cost';
import type { PriceTable } from '../pricing/price-table';
import { computeLongestStreak, createLocalTimeReader } from './local-time';
import type {
  AgentStats,
  DayStats,
  ModelStats,
  SessionStats,
  UsageBreakdown,
  WrappedStats,
} from './wrapped-stats';

export interface ComputeStatsOptions {
  year: number;
  timeZone: string;
  priceTable: PriceTable;
}

interface SessionAccumulator {
  agentId: AgentId;
  firstTimestampMs: number;
  lastTimestampMs: number;
  totalTokens: number;
  date: string;
}

function createBreakdown(): UsageBreakdown {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    eventCount: 0,
    costUsd: 0,
  };
}

function sumEventTokens(event: UsageEvent): number {
  return event.inputTokens + event.outputTokens + event.cacheReadTokens + event.cacheWriteTokens;
}

function addEvent(breakdown: UsageBreakdown, event: UsageEvent, costUsd: number): void {
  breakdown.inputTokens += event.inputTokens;
  breakdown.outputTokens += event.outputTokens;
  breakdown.cacheReadTokens += event.cacheReadTokens;
  breakdown.cacheWriteTokens += event.cacheWriteTokens;
  breakdown.totalTokens += sumEventTokens(event);
  breakdown.eventCount += 1;
  breakdown.costUsd += costUsd;
}

function getOrCreate<TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey,
  create: () => TValue,
): TValue {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

/**
 * Turns normalized events into the year's stats.
 * Pure: same events and options always give the same result.
 */
export function computeStats(
  events: readonly UsageEvent[],
  options: ComputeStatsOptions,
): WrappedStats {
  const readLocalTime = createLocalTimeReader(options.timeZone);

  const totals = createBreakdown();
  const agentsById = new Map<AgentId, AgentStats>();
  const modelsByName = new Map<string, ModelStats>();
  const daysByDate = new Map<string, DayStats>();
  const sessionsById = new Map<string, SessionAccumulator>();
  const projectHashes = new Set<string>();
  const unpricedModels = new Set<string>();
  const eventsByHour = new Array<number>(24).fill(0);
  const eventsByWeekday = new Array<number>(7).fill(0);
  const tokensByMonth = new Array<number>(12).fill(0);

  for (const event of events) {
    const eventCostUsd = computeCostUsd(event, options.priceTable);
    if (eventCostUsd === undefined) unpricedModels.add(event.model);
    const costUsd = eventCostUsd ?? 0;
    const totalTokens = sumEventTokens(event);
    const localTime = readLocalTime(event.timestamp);
    const timestampMs = event.timestamp.getTime();

    addEvent(totals, event, costUsd);

    const agent = getOrCreate(agentsById, event.agentId, () => ({
      ...createBreakdown(),
      agentId: event.agentId,
      sessionCount: 0,
    }));
    addEvent(agent, event, costUsd);

    const model = getOrCreate(modelsByName, event.model, () => ({
      ...createBreakdown(),
      model: event.model,
    }));
    addEvent(model, event, costUsd);

    const day = getOrCreate(daysByDate, localTime.date, () => ({
      date: localTime.date,
      totalTokens: 0,
      costUsd: 0,
    }));
    day.totalTokens += totalTokens;
    day.costUsd += costUsd;

    const session = getOrCreate(sessionsById, `${event.agentId}:${event.sessionId}`, () => ({
      agentId: event.agentId,
      firstTimestampMs: timestampMs,
      lastTimestampMs: timestampMs,
      totalTokens: 0,
      date: localTime.date,
    }));
    session.firstTimestampMs = Math.min(session.firstTimestampMs, timestampMs);
    session.lastTimestampMs = Math.max(session.lastTimestampMs, timestampMs);
    session.totalTokens += totalTokens;

    if (event.projectHash) projectHashes.add(event.projectHash);
    eventsByHour[localTime.hour] = (eventsByHour[localTime.hour] ?? 0) + 1;
    eventsByWeekday[localTime.weekdayIndex] = (eventsByWeekday[localTime.weekdayIndex] ?? 0) + 1;
    tokensByMonth[localTime.monthIndex] = (tokensByMonth[localTime.monthIndex] ?? 0) + totalTokens;
  }

  let longestSession: SessionStats | undefined;
  for (const session of sessionsById.values()) {
    const agent = agentsById.get(session.agentId);
    if (agent) agent.sessionCount += 1;
    const durationMs = session.lastTimestampMs - session.firstTimestampMs;
    if (!longestSession || durationMs > longestSession.durationMs) {
      longestSession = {
        agentId: session.agentId,
        durationMs,
        totalTokens: session.totalTokens,
        date: session.date,
      };
    }
  }

  let busiestDay: DayStats | undefined;
  for (const day of daysByDate.values()) {
    if (!busiestDay || day.totalTokens > busiestDay.totalTokens) busiestDay = day;
  }

  const activeDates = [...daysByDate.keys()].sort();
  const allInputTokens = totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens;
  const byTotalTokensDesc = (a: UsageBreakdown, b: UsageBreakdown) => b.totalTokens - a.totalTokens;

  return {
    year: options.year,
    timeZone: options.timeZone,
    totals,
    sessionCount: sessionsById.size,
    projectCount: projectHashes.size,
    activeDayCount: daysByDate.size,
    longestStreakDays: computeLongestStreak(daysByDate.keys()),
    firstActiveDate: activeDates[0],
    lastActiveDate: activeDates[activeDates.length - 1],
    cacheHitRate: allInputTokens === 0 ? 0 : totals.cacheReadTokens / allInputTokens,
    agents: [...agentsById.values()].sort(byTotalTokensDesc),
    models: [...modelsByName.values()].sort(byTotalTokensDesc),
    busiestDay,
    longestSession,
    eventsByHour,
    eventsByWeekday,
    tokensByMonth,
    unpricedModels: [...unpricedModels].sort(),
  };
}
