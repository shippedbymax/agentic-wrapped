export interface LocalTimeParts {
  /** `YYYY-MM-DD` */
  date: string;
  /** 0 = January */
  monthIndex: number;
  /** 0..23 */
  hour: number;
  /** 0 = Monday .. 6 = Sunday */
  weekdayIndex: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Returns a function that splits a timestamp into calendar parts in the given time zone. */
export function createLocalTimeReader(timeZone: string): (timestamp: Date) => LocalTimeParts {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });

  return (timestamp) => {
    const parts: Record<string, string> = {};
    for (const part of format.formatToParts(timestamp)) parts[part.type] = part.value;
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      monthIndex: Number(parts.month) - 1,
      hour: Number(parts.hour),
      weekdayIndex: WEEKDAYS.indexOf(parts.weekday ?? ''),
    };
  };
}

const MS_PER_DAY = 86_400_000;

/** Longest run of consecutive calendar days in a list of `YYYY-MM-DD` strings. */
export function computeLongestStreak(dates: Iterable<string>): number {
  const dayNumbers = [...new Set(dates)]
    .map((date) => Math.round(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY))
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDay: number | undefined;
  for (const day of dayNumbers) {
    currentStreak = previousDay !== undefined && day === previousDay + 1 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDay = day;
  }
  return longestStreak;
}
