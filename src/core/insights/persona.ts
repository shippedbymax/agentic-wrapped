import type { WrappedStats } from '../stats/wrapped-stats';

export interface Persona {
  name: string;
  reason: string;
}

function sumRange(values: readonly number[], from: number, to: number): number {
  let sum = 0;
  for (let index = from; index <= to; index += 1) sum += values[index] ?? 0;
  return sum;
}

/** Picks one persona from when the user works. First matching rule wins. */
export function pickPersona(stats: WrappedStats): Persona {
  const eventCount = stats.totals.eventCount;
  if (eventCount === 0) return { name: 'The Lurker', reason: 'No agent activity this year.' };

  const nightShare =
    (sumRange(stats.eventsByHour, 22, 23) + sumRange(stats.eventsByHour, 0, 4)) / eventCount;
  const earlyShare = sumRange(stats.eventsByHour, 5, 8) / eventCount;
  const weekendShare = sumRange(stats.eventsByWeekday, 5, 6) / eventCount;
  const officeShare = sumRange(stats.eventsByHour, 9, 17) / eventCount;

  if (nightShare >= 0.3) {
    return {
      name: 'The Night Owl',
      reason: `${Math.round(nightShare * 100)}% of your prompts ran between 10pm and 5am.`,
    };
  }
  if (earlyShare >= 0.25) {
    return {
      name: 'The Early Bird',
      reason: `${Math.round(earlyShare * 100)}% of your prompts ran before 9am.`,
    };
  }
  if (weekendShare >= 0.35) {
    return {
      name: 'The Weekend Warrior',
      reason: `${Math.round(weekendShare * 100)}% of your prompts ran on weekends.`,
    };
  }
  if (stats.longestStreakDays >= 30) {
    return {
      name: 'The Marathoner',
      reason: `${stats.longestStreakDays} days in a row without a break.`,
    };
  }
  if (officeShare >= 0.7) {
    return {
      name: 'The Nine-to-Fiver',
      reason: `${Math.round(officeShare * 100)}% of your prompts ran in office hours.`,
    };
  }
  return { name: 'The All-Rounder', reason: 'You ship at any hour, on any day.' };
}
