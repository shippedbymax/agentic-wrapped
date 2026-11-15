import { describe, expect, it } from 'vitest';
import { TEST_PRICE_TABLE, createEvent } from '../../test/create-event';
import { buildReport } from '../core';
import { buildCard } from './image/build-card';
import { imageRenderer } from './image/index';
import { jsonRenderer } from './json/index';
import { terminalRenderer } from './terminal/index';

const { report } = buildReport(
  [
    createEvent({ eventId: 'a', timestamp: new Date('2026-03-09T10:00:00Z'), outputTokens: 4000 }),
    createEvent({
      eventId: 'b',
      timestamp: new Date('2026-07-01T11:30:00Z'),
      agentId: 'codex',
      sessionId: 's2',
    }),
  ],
  { year: 2026, timeZone: 'UTC', priceTable: TEST_PRICE_TABLE },
);

describe('renderers', () => {
  it('json: round-trips the report', async () => {
    const parsed = JSON.parse(await jsonRenderer.render(report));
    expect(parsed.stats.totals.totalTokens).toBe(report.stats.totals.totalTokens);
    expect(parsed.insights).toHaveLength(report.insights.length);
  });

  it('terminal: shows every insight and agent', async () => {
    const text = await terminalRenderer.render(report);
    for (const insight of report.insights) expect(text).toContain(insight.title);
    expect(text).toContain('Claude Code');
    expect(text).toContain('Codex');
  });

  it('image: same report gives the same card', () => {
    expect(buildCard(report)).toEqual(buildCard(report));
    expect(buildCard(report)).toMatchSnapshot();
  });

  it('image: renders a PNG', async () => {
    const png = await imageRenderer.render(report);
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(png.length).toBeGreaterThan(10_000);
  });
});
