import type { AgentId } from '../events/usage-event';

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

export interface UsageBreakdown extends TokenTotals {
  eventCount: number;
  costUsd: number;
}

export interface AgentStats extends UsageBreakdown {
  agentId: AgentId;
  sessionCount: number;
}

export interface ModelStats extends UsageBreakdown {
  model: string;
}

export interface DayStats {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  totalTokens: number;
  costUsd: number;
}

export interface SessionStats {
  agentId: AgentId;
  durationMs: number;
  totalTokens: number;
  /** Local calendar day the session started, `YYYY-MM-DD`. */
  date: string;
}

/** The full year in numbers. Plain data: safe to serialize as JSON. */
export interface WrappedStats {
  year: number;
  timeZone: string;
  totals: UsageBreakdown;
  sessionCount: number;
  projectCount: number;
  activeDayCount: number;
  longestStreakDays: number;
  /** Share of input that was served from cache, 0..1. */
  cacheHitRate: number;
  /** Sorted by total tokens, biggest first. */
  agents: AgentStats[];
  /** Sorted by total tokens, biggest first. */
  models: ModelStats[];
  busiestDay: DayStats | undefined;
  longestSession: SessionStats | undefined;
  /** Events per local hour of day, index 0..23. */
  eventsByHour: number[];
  /** Events per weekday, index 0 = Monday .. 6 = Sunday. */
  eventsByWeekday: number[];
  /** Total tokens per month, index 0 = January. */
  tokensByMonth: number[];
  /** Models that have no known price. Their cost is not in `totals.costUsd`. */
  unpricedModels: string[];
}
