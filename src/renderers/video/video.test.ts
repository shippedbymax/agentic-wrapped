import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import { TEST_PRICE_TABLE, createEvent } from '../../../test/create-event';
import { REPOSITORY_URL, buildReport } from '../../core';
import { videoRenderer } from './index';
import { renderBeat } from './player/beat';
import { type SceneContext, drawFrame } from './player/scene';
import {
  SCENE_SEC,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  countScenes,
  getVideoDurationSec,
} from './player/timing';
import { buildVideoData } from './video-data';

const { report } = buildReport(
  [
    createEvent({ eventId: 'a', timestamp: new Date('2026-03-09T10:00:00Z'), outputTokens: 4000 }),
    createEvent({ eventId: 'b', timestamp: new Date('2026-03-09T11:30:00Z') }),
  ],
  { year: 2026, timeZone: 'UTC', priceTable: TEST_PRICE_TABLE },
);
const data = buildVideoData(report);

function renderFramePixels(timeSec: number): Uint8ClampedArray {
  const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
  drawFrame(canvas.getContext('2d') as unknown as SceneContext, timeSec, data);
  return canvas.getContext('2d').getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT).data;
}

describe('buildVideoData', () => {
  it('turns the report into slides with count-up targets', () => {
    expect(data.slides.map((slide) => slide.label)).toEqual([
      'Total tokens',
      'API value',
      'Favorite model',
      'Longest session',
      'Longest streak',
    ]);
    expect(data.slides[0]?.count).toEqual({
      target: report.stats.totals.totalTokens,
      kind: 'compact',
    });
    expect(data.agentNames).toBe('Claude Code');
    expect(getVideoDurationSec(data)).toBe(20);
  });

  it('is shorter when a slide has no data', () => {
    const { report: oneEventReport } = buildReport([createEvent()], {
      year: 2026,
      timeZone: 'UTC',
      priceTable: TEST_PRICE_TABLE,
    });
    // A single event has no session length, so that slide is left out.
    expect(countScenes(buildVideoData(oneEventReport))).toBe(7);
  });
});

describe('drawFrame', () => {
  it('is deterministic', () => {
    expect(renderFramePixels(7.3)).toEqual(renderFramePixels(7.3));
  });

  it('draws a different picture in every scene', () => {
    const backgroundColors = new Set<string>();
    for (let scene = 0; scene < countScenes(data); scene += 1) {
      const pixels = renderFramePixels(scene * SCENE_SEC + 2);
      // A pixel near the left edge, away from the text.
      const offset = (700 * VIDEO_WIDTH + 4) * 4;
      backgroundColors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
    }
    expect(backgroundColors.size).toBeGreaterThanOrEqual(6);
  });

  it('holds the last frame for times past the end and clamps negative times', () => {
    expect(renderFramePixels(999)).toEqual(renderFramePixels(getVideoDurationSec(data)));
    expect(renderFramePixels(-5)).toEqual(renderFramePixels(0));
  });
});

describe('renderBeat', () => {
  const sampleRate = 8000;
  const samples = renderBeat(sampleRate, 8);

  it('lasts exactly as long as the video', () => {
    expect(samples.length).toBe(20 * sampleRate);
  });

  it('is audible, never clips and ends in silence', () => {
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(1);
    expect(Math.abs(samples[samples.length - 1] ?? 1)).toBeLessThan(0.01);
  });

  it('is deterministic', () => {
    expect(renderBeat(sampleRate, 2)).toEqual(renderBeat(sampleRate, 2));
  });
});

describe('videoRenderer', () => {
  it('builds one self-contained page with no external references', async () => {
    const page = await videoRenderer.render(report);
    expect(page).toContain('<canvas id="stage">');
    expect(page).toContain('"personaName"');
    // One link to the repository is allowed. It opens on click and loads nothing.
    expect(page).toContain(`<a href="${REPOSITORY_URL}"`);
    expect(page.replace(REPOSITORY_URL, '')).not.toContain('://');
    expect(packageJson.repository.url).toBe(`git+${REPOSITORY_URL}.git`);
    expect(page).not.toMatch(/<script[^>]+src=|<link/);
  });
});
