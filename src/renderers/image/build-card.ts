import { type Insight, type WrappedReport, describePeriod, formatAgentName } from '../../core';
import { type CardElement, box } from './element';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const COLOR = {
  background: '#0b0b12',
  panel: '#161625',
  panelBorder: '#26263a',
  text: '#f5f5fa',
  muted: '#8b8ba7',
  accent: '#c084fc',
  accentSoft: '#3b2a5c',
} as const;

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const TILE_INSIGHT_IDS = [
  'total-tokens',
  'cost',
  'favorite-model',
  'longest-session',
  'streak',
  'busiest-day',
];
const CHART_HEIGHT = 110;

function findInsight(insights: readonly Insight[], id: string): Insight | undefined {
  return insights.find((insight) => insight.id === id);
}

/** Shrinks long values (model names) so they stay on one line. */
function pickValueFontSize(value: string): number {
  if (value.length <= 8) return 64;
  if (value.length <= 13) return 48;
  if (value.length <= 20) return 36;
  return 26;
}

function buildTile(insight: Insight): CardElement {
  return box(
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: 478,
      height: 172,
      padding: 24,
      borderRadius: 28,
      backgroundColor: COLOR.panel,
      border: `2px solid ${COLOR.panelBorder}`,
    },
    box({ fontSize: 24, color: COLOR.muted, letterSpacing: 1 }, insight.title.toUpperCase()),
    box(
      {
        fontSize: pickValueFontSize(insight.value),
        fontWeight: 800,
        color: COLOR.text,
        whiteSpace: 'nowrap',
      },
      insight.value,
    ),
    box({ fontSize: 22, color: COLOR.muted }, insight.detail),
  );
}

function buildMonthChart(tokensByMonth: readonly number[]): CardElement {
  const maxTokens = Math.max(1, ...tokensByMonth);
  return box(
    { justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' },
    ...tokensByMonth.map((tokens, monthIndex) =>
      box(
        { flexDirection: 'column', alignItems: 'center' },
        box({
          width: 52,
          height: Math.max(6, Math.round((tokens / maxTokens) * CHART_HEIGHT)),
          borderRadius: 10,
          backgroundColor: tokens === maxTokens ? COLOR.accent : COLOR.accentSoft,
        }),
        box({ marginTop: 10, fontSize: 20, color: COLOR.muted }, MONTH_LETTERS[monthIndex] ?? ''),
      ),
    ),
  );
}

/** The share card as an element tree. Pure: same report, same tree. */
export function buildCard(report: WrappedReport): CardElement {
  const { stats, insights } = report;
  const persona = findInsight(insights, 'persona');
  const tiles = TILE_INSIGHT_IDS.map((id) => findInsight(insights, id)).filter(
    (insight): insight is Insight => insight !== undefined,
  );
  const period = describePeriod(stats);
  const agentNames = stats.agents.map((agent) => formatAgentName(agent.agentId)).join(' + ');

  return box(
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      padding: 48,
      backgroundColor: COLOR.background,
      backgroundImage: 'linear-gradient(160deg, #1d1033 0%, #0b0b12 45%)',
      color: COLOR.text,
      fontFamily: 'Inter',
    },
    box(
      { flexDirection: 'column' },
      box(
        { fontSize: 28, color: COLOR.accent, fontWeight: 700, letterSpacing: 4 },
        'AGENT WRAPPED',
      ),
      box({ fontSize: 64, fontWeight: 800, marginTop: 6 }, period.headline),
      box({ fontSize: 26, color: COLOR.muted, marginTop: 6 }, `${agentNames} · ${period.range}`),
    ),
    box(
      {
        flexDirection: 'column',
        padding: 28,
        borderRadius: 28,
        backgroundColor: COLOR.accentSoft,
      },
      box({ fontSize: 24, color: COLOR.accent, letterSpacing: 1 }, 'YOUR TYPE'),
      box({ fontSize: 56, fontWeight: 800, marginTop: 4 }, persona?.value ?? 'The Builder'),
      box({ fontSize: 24, color: COLOR.text, marginTop: 4 }, persona?.detail ?? ''),
    ),
    box({ flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }, ...tiles.map(buildTile)),
    box(
      { flexDirection: 'column' },
      box(
        { fontSize: 22, color: COLOR.muted, letterSpacing: 1, marginBottom: 14 },
        'TOKENS BY MONTH',
      ),
      buildMonthChart(stats.tokensByMonth),
    ),
    box(
      { justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: COLOR.muted },
      box({}, 'Get yours:'),
      box({ color: COLOR.text, fontWeight: 700 }, 'npx agent-wrapped'),
    ),
  );
}
