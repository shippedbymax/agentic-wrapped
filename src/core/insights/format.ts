import { AGENT_DISPLAY_NAMES, type AgentId } from '../events/usage-event';

const COMPACT_UNITS: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** 1234567 -> `1.2M`. */
export function formatCompactNumber(value: number): string {
  for (const [threshold, suffix] of COMPACT_UNITS) {
    if (value >= threshold) {
      const scaled = value / threshold;
      return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return String(Math.round(value));
}

/** 1234.5 -> `$1,235`, 12.345 -> `$12.35`. */
export function formatUsd(valueUsd: number): string {
  const fractionDigits = valueUsd >= 100 ? 0 : 2;
  return `$${valueUsd.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** 5400000 -> `1h 30m`. */
export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2026-03-09` -> `Mar 9`. */
export function formatDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${MONTH_NAMES[Number(month) - 1] ?? '?'} ${Number(day)}`;
}

export function formatAgentName(agentId: AgentId): string {
  return AGENT_DISPLAY_NAMES[agentId];
}

/** `claude-sonnet-4-5-20250929` -> `claude-sonnet-4-5`. Drops the release date for display. */
export function formatModelName(model: string): string {
  return model.replace(/-\d{8}$/, '');
}
