import {
  type Insight,
  type WrappedReport,
  buildShareText,
  describePeriod,
  formatAgentName,
} from '../../core';

type CountKind = 'compact' | 'usd' | 'days';

/** One full-screen stat. `count` makes the number count up to its value. */
export interface VideoSlide {
  label: string;
  value: string;
  detail: string;
  count?: { target: number; kind: CountKind };
}

/** Everything the video player needs. Plain JSON: it is inlined into the HTML file. */
export interface VideoData {
  year: number;
  /** True for the built-in sample. The video then says "demo data" on every frame. */
  isDemo: boolean;
  /** The big word of the intro: `2026` or `30 days`. */
  introTitle: string;
  /** `Oct 17 - Nov 15` */
  range: string;
  agentNames: string;
  /** Ready-to-post text shown under the video. */
  shareText: string;
  slides: VideoSlide[];
  tokensByMonth: number[];
  busiestDay: string;
  personaName: string;
  personaReason: string;
}

function toSlide(insight: Insight, count?: VideoSlide['count']): VideoSlide {
  return {
    label: insight.title,
    value: insight.value,
    detail: insight.detail,
    ...(count ? { count } : {}),
  };
}

/** Picks what the video shows from a report. Pure. */
export function buildVideoData(report: WrappedReport): VideoData {
  const { stats, insights } = report;
  const find = (id: string) => insights.find((insight) => insight.id === id);
  const period = describePeriod(stats);
  const slides: VideoSlide[] = [];

  const totalTokens = find('total-tokens');
  if (totalTokens) {
    slides.push(toSlide(totalTokens, { target: stats.totals.totalTokens, kind: 'compact' }));
  }
  const cost = find('cost');
  if (cost) slides.push(toSlide(cost, { target: stats.totals.costUsd, kind: 'usd' }));
  const favoriteModel = find('favorite-model');
  if (favoriteModel) slides.push(toSlide(favoriteModel));
  const longestSession = find('longest-session');
  if (longestSession) slides.push(toSlide(longestSession));
  const streak = find('streak');
  if (streak) slides.push(toSlide(streak, { target: stats.longestStreakDays, kind: 'days' }));

  return {
    year: stats.year,
    isDemo: report.isDemo,
    introTitle: period.title,
    range: period.range,
    shareText: report.isDemo ? '' : buildShareText(stats),
    agentNames: stats.agents.map((agent) => formatAgentName(agent.agentId)).join(' + '),
    slides,
    tokensByMonth: stats.tokensByMonth,
    busiestDay: find('busiest-day')?.value ?? '',
    personaName: find('persona')?.value ?? 'The Builder',
    personaReason: find('persona')?.detail ?? '',
  };
}
