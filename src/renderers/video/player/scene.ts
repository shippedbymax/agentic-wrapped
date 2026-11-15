import { formatCompactNumber, formatUsd } from '../../../core/insights/format';
import type { VideoData, VideoSlide } from '../video-data';
import {
  CENTER_X,
  CENTER_Y,
  type SceneContext,
  TWO_PI,
  beatPulse,
  clamp01,
  drawRisingText,
  drawText,
  easeOutBack,
  easeOutCubic,
  progress,
  setFont,
} from './canvas-kit';
import { INTRO_LOOK, type Look, MONTHS_LOOK, PERSONA_LOOK, drawBackground, getLook } from './looks';
import { SCENE_SEC, VIDEO_HEIGHT, VIDEO_WIDTH, countScenes } from './timing';

/**
 * Draws one frame of the video. Pure: the picture depends only on `timeSec` and `data`.
 * It runs in the browser (the player) and in Node (tests, preview render).
 */
export type { SceneContext } from './canvas-kit';

const TRANSITION_SEC = 0.45;
const MONTH_LETTERS = 'JFMAMJJASOND';

function drawIntro(ctx: SceneContext, data: VideoData, sceneTimeSec: number): void {
  const look = INTRO_LOOK;
  drawRisingText(ctx, 'AGENTIC WRAPPED', 430, sceneTimeSec, 0.05, {
    size: 44,
    weight: 700,
    color: look.accent,
  });
  const yearPop = easeOutBack(progress(sceneTimeSec, 0.25, 0.55));
  drawText(ctx, data.introTitle, 640, {
    size: 330,
    weight: 800,
    color: look.text,
    alpha: yearPop * 2,
    scale: yearPop * (1 + beatPulse(sceneTimeSec) * 0.03),
  });
  drawRisingText(ctx, 'with AI coding agents', 860, sceneTimeSec, 0.75, {
    size: 62,
    weight: 700,
    color: look.text,
  });
  drawRisingText(ctx, data.agentNames, 950, sceneTimeSec, 1.05, {
    size: 40,
    weight: 400,
    color: look.accent,
  });
  drawRisingText(ctx, data.range, 1015, sceneTimeSec, 1.2, {
    size: 34,
    weight: 400,
    color: look.text,
  });
}

function formatCount(slide: VideoSlide, sceneTimeSec: number): string {
  if (!slide.count) return slide.value;
  const p = easeOutCubic(progress(sceneTimeSec, 0.2, 1.3));
  if (p >= 1) return slide.value;
  const current = slide.count.target * p;
  if (slide.count.kind === 'compact') return formatCompactNumber(current);
  if (slide.count.kind === 'usd') return formatUsd(current);
  return `${Math.round(current)} days`;
}

function drawSlide(ctx: SceneContext, slide: VideoSlide, look: Look, sceneTimeSec: number): void {
  drawRisingText(ctx, slide.label.toUpperCase(), 450, sceneTimeSec, 0.05, {
    size: 46,
    weight: 700,
    color: look.accent,
  });
  const pop = easeOutBack(progress(sceneTimeSec, 0.15, 0.5));
  drawText(ctx, formatCount(slide, sceneTimeSec), 660, {
    size: 250,
    weight: 800,
    color: look.text,
    alpha: pop * 2,
    scale: pop * (1 + beatPulse(sceneTimeSec) * 0.035),
  });
  drawRisingText(ctx, slide.detail, 870, sceneTimeSec, 0.7, {
    size: 46,
    weight: 400,
    color: look.text,
  });
}

function drawMonths(ctx: SceneContext, data: VideoData, sceneTimeSec: number): void {
  const look = MONTHS_LOOK;
  const chartLeft = 90;
  const chartBottom = 1010;
  const chartHeight = 520;
  const slotWidth = (VIDEO_WIDTH - chartLeft * 2) / 12;
  const maxTokens = Math.max(1, ...data.tokensByMonth);

  drawRisingText(ctx, 'TOKENS BY MONTH', 300, sceneTimeSec, 0.05, {
    size: 46,
    weight: 700,
    color: look.accent,
  });
  data.tokensByMonth.forEach((tokens, monthIndex) => {
    const grow = easeOutBack(progress(sceneTimeSec, 0.15 + monthIndex * 0.06, 0.5));
    const isPeak = tokens === maxTokens;
    const height = Math.max(10, (tokens / maxTokens) * chartHeight) * grow;
    const x = chartLeft + monthIndex * slotWidth;
    ctx.fillStyle = isPeak ? look.accent : look.text;
    ctx.globalAlpha = isPeak ? 1 : 0.85;
    ctx.fillRect(x + 10, chartBottom - height, slotWidth - 20, height);
    ctx.globalAlpha = 1;
    setFont(ctx, 700, 30);
    ctx.fillStyle = look.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(MONTH_LETTERS[monthIndex] ?? '', x + slotWidth / 2, chartBottom + 40);
  });
  if (data.busiestDay) {
    drawRisingText(ctx, `Busiest day: ${data.busiestDay}`, 1150, sceneTimeSec, 1.0, {
      size: 52,
      weight: 700,
      color: look.text,
    });
  }
}

function drawPersona(ctx: SceneContext, data: VideoData, sceneTimeSec: number): void {
  const look = PERSONA_LOOK;
  drawRisingText(ctx, 'YOUR TYPE', 400, sceneTimeSec, 0.05, {
    size: 46,
    weight: 700,
    color: look.accent,
  });
  const pop = easeOutBack(progress(sceneTimeSec, 0.2, 0.55));
  drawText(ctx, data.personaName, 590, {
    size: 150,
    weight: 800,
    color: look.text,
    alpha: pop * 2,
    scale: pop * (1 + beatPulse(sceneTimeSec) * 0.03),
  });
  drawRisingText(ctx, data.personaReason, 760, sceneTimeSec, 0.75, {
    size: 40,
    weight: 400,
    color: look.text,
  });

  const pillIn = easeOutBack(progress(sceneTimeSec, 1.15, 0.5));
  if (pillIn > 0) {
    ctx.save();
    ctx.translate(CENTER_X, 1010);
    ctx.scale(pillIn, pillIn);
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.arc(-250, 0, 62, Math.PI / 2, Math.PI * 1.5);
    ctx.arc(250, 0, 62, Math.PI * 1.5, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    setFont(ctx, 800, 50);
    ctx.fillStyle = '#0b0b12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('npx agentic-wrapped', 0, 2);
    ctx.restore();
  }
  drawRisingText(ctx, 'Get yours. 100% local.', 1130, sceneTimeSec, 1.45, {
    size: 38,
    weight: 400,
    color: look.text,
  });
}

function drawScene(ctx: SceneContext, data: VideoData, sceneIndex: number, timeSec: number): void {
  const sceneTimeSec = timeSec - sceneIndex * SCENE_SEC;
  const look = getLook(data, sceneIndex);
  drawBackground(ctx, look, timeSec);

  const slide = data.slides[sceneIndex - 1];
  if (sceneIndex === 0) drawIntro(ctx, data, sceneTimeSec);
  else if (slide) drawSlide(ctx, slide, look, sceneTimeSec);
  else if (sceneIndex === data.slides.length + 1) drawMonths(ctx, data, sceneTimeSec);
  else drawPersona(ctx, data, sceneTimeSec);
}

/** Story-style progress bar plus a small watermark, on top of every scene. */
function drawOverlay(
  ctx: SceneContext,
  data: VideoData,
  sceneIndex: number,
  timeSec: number,
): void {
  const sceneCount = countScenes(data);
  const color = getLook(data, sceneIndex).text;
  const gap = 10;
  const segmentWidth = (VIDEO_WIDTH - 80 - gap * (sceneCount - 1)) / sceneCount;
  ctx.fillStyle = color;
  for (let segment = 0; segment < sceneCount; segment += 1) {
    const x = 40 + segment * (segmentWidth + gap);
    const filled = clamp01(timeSec / SCENE_SEC - segment);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x, 40, segmentWidth, 8);
    ctx.globalAlpha = 1;
    ctx.fillRect(x, 40, segmentWidth * filled, 8);
  }
  setFont(ctx, 700, 30);
  ctx.globalAlpha = 0.75;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(
    data.isDemo ? 'agentic-wrapped · demo data' : 'agentic-wrapped',
    40,
    VIDEO_HEIGHT - 50,
  );
  ctx.textAlign = 'right';
  ctx.fillText(String(data.year), VIDEO_WIDTH - 40, VIDEO_HEIGHT - 50);
  ctx.globalAlpha = 1;
}

/** Draws the frame at `timeSec`. Times past the end show the last frame. */
export function drawFrame(ctx: SceneContext, timeSec: number, data: VideoData): void {
  const sceneCount = countScenes(data);
  const lastMoment = sceneCount * SCENE_SEC - 1e-6;
  const clampedTimeSec = Math.min(Math.max(0, timeSec), lastMoment);
  const sceneIndex = Math.floor(clampedTimeSec / SCENE_SEC);
  const sceneTimeSec = clampedTimeSec - sceneIndex * SCENE_SEC;

  ctx.save();
  if (sceneIndex > 0 && sceneTimeSec < TRANSITION_SEC) {
    // The new scene opens as a growing circle over the previous one.
    drawScene(ctx, data, sceneIndex - 1, clampedTimeSec);
    const reveal = easeOutCubic(sceneTimeSec / TRANSITION_SEC);
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, reveal * 900, 0, TWO_PI);
    ctx.clip();
  }
  drawScene(ctx, data, sceneIndex, clampedTimeSec);
  ctx.restore();
  drawOverlay(ctx, data, sceneIndex, clampedTimeSec);
}
