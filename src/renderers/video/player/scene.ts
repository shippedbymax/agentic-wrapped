import { formatCompactNumber, formatUsd } from '../../../core/insights/format';
import type { VideoData, VideoSlide } from '../video-data';
import { BEAT_SEC, SCENE_SEC, VIDEO_HEIGHT, VIDEO_WIDTH, countScenes } from './timing';

/**
 * Draws one frame of the video. Pure: the picture depends only on `timeSec` and `data`.
 * It runs in the browser (the player) and in Node (tests, preview render), so it only
 * uses the small part of the Canvas 2D API listed in `SceneContext`.
 */
export interface SceneContext {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
}

type Motif = 'blobs' | 'rings' | 'stripes' | 'dots' | 'burst';

interface Look {
  background: string;
  text: string;
  accent: string;
  motif: Motif;
}

const LOOKS: readonly Look[] = [
  { background: '#f037a5', text: '#0b0b12', accent: '#ffffff', motif: 'rings' },
  { background: '#cdf564', text: '#0b0b12', accent: '#4100f5', motif: 'stripes' },
  { background: '#4100f5', text: '#ffffff', accent: '#cdf564', motif: 'dots' },
  { background: '#ff4632', text: '#ffffff', accent: '#0b0b12', motif: 'burst' },
  { background: '#0b0b12', text: '#cdf564', accent: '#f037a5', motif: 'rings' },
];
const INTRO_LOOK: Look = {
  background: '#12061f',
  text: '#ffffff',
  accent: '#c084fc',
  motif: 'blobs',
};
const MONTHS_LOOK: Look = {
  background: '#1e3264',
  text: '#ffffff',
  accent: '#f037a5',
  motif: 'dots',
};
const PERSONA_LOOK: Look = {
  background: '#7c3aed',
  text: '#ffffff',
  accent: '#cdf564',
  motif: 'burst',
};

const CENTER_X = VIDEO_WIDTH / 2;
const CENTER_Y = VIDEO_HEIGHT / 2;
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 120;
const TRANSITION_SEC = 0.45;
const FONT_FAMILY = 'Inter, "Helvetica Neue", Arial, sans-serif';
const MONTH_LETTERS = 'JFMAMJJASOND';
const TWO_PI = Math.PI * 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** Progress 0..1 of an animation that starts at `startSec` and takes `lengthSec`. */
const progress = (timeSec: number, startSec: number, lengthSec: number) =>
  clamp01((timeSec - startSec) / lengthSec);
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const easeOutBack = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
/** 1 on every beat, then fades quickly. Makes things bounce to the music. */
const beatPulse = (timeSec: number) => Math.exp(-7 * ((timeSec / BEAT_SEC) % 1));

function setFont(ctx: SceneContext, weight: number, size: number): void {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT_FAMILY}`;
}

/** Draws centered text, shrinking the font until it fits the frame. */
function drawText(
  ctx: SceneContext,
  text: string,
  y: number,
  options: { size: number; weight: number; color: string; alpha?: number; scale?: number },
): void {
  let size = options.size;
  setFont(ctx, options.weight, size);
  const width = ctx.measureText(text).width;
  if (width > MAX_TEXT_WIDTH) {
    size *= MAX_TEXT_WIDTH / width;
    setFont(ctx, options.weight, size);
  }
  ctx.save();
  ctx.globalAlpha = clamp01(options.alpha ?? 1);
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(CENTER_X, y);
  ctx.scale(options.scale ?? 1, options.scale ?? 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Text that slides up and fades in, starting at `startSec` of the scene. */
function drawRisingText(
  ctx: SceneContext,
  text: string,
  y: number,
  sceneTimeSec: number,
  startSec: number,
  options: { size: number; weight: number; color: string },
): void {
  const p = easeOutCubic(progress(sceneTimeSec, startSec, 0.45));
  drawText(ctx, text, y + (1 - p) * 60, { ...options, alpha: p });
}

function drawMotif(ctx: SceneContext, look: Look, timeSec: number): void {
  const pulse = beatPulse(timeSec);
  ctx.save();
  ctx.fillStyle = look.accent;
  ctx.strokeStyle = look.accent;

  if (look.motif === 'rings') {
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 10 + pulse * 14;
    for (let ring = 0; ring < 7; ring += 1) {
      const radius = ((ring * 170 + timeSec * 140) % 1190) + 20;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, radius, 0, TWO_PI);
      ctx.stroke();
    }
  } else if (look.motif === 'stripes') {
    ctx.globalAlpha = 0.16;
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(-0.5);
    const offset = (timeSec * 160) % 200;
    for (let stripe = -8; stripe < 9; stripe += 1) {
      ctx.fillRect(-1400, stripe * 200 + offset, 2800, 70 + pulse * 30);
    }
  } else if (look.motif === 'dots') {
    ctx.globalAlpha = 0.3;
    for (let row = 0; row < 12; row += 1) {
      for (let column = 0; column < 10; column += 1) {
        const wave = Math.sin(timeSec * 3 + row * 0.6 + column * 0.8);
        ctx.beginPath();
        ctx.arc(60 + column * 107, 70 + row * 112, 9 + wave * 6 + pulse * 6, 0, TWO_PI);
        ctx.fill();
      }
    }
  } else if (look.motif === 'burst') {
    ctx.globalAlpha = 0.14;
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(timeSec * 0.35);
    for (let ray = 0; ray < 12; ray += 1) {
      ctx.rotate(TWO_PI / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(1500, -150 - pulse * 60);
      ctx.lineTo(1500, 150 + pulse * 60);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const blobColors = [look.accent, '#f037a5', '#4100f5'];
    for (let blob = 0; blob < 3; blob += 1) {
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = blobColors[blob] ?? look.accent;
      const angle = timeSec * (0.5 + blob * 0.2) + blob * 2.1;
      ctx.beginPath();
      ctx.arc(
        CENTER_X + Math.cos(angle) * 330,
        CENTER_Y + Math.sin(angle * 1.3) * 430,
        250 + blob * 50 + pulse * 40,
        0,
        TWO_PI,
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBackground(ctx: SceneContext, look: Look, timeSec: number): void {
  ctx.fillStyle = look.background;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  drawMotif(ctx, look, timeSec);
}

function drawIntro(ctx: SceneContext, data: VideoData, sceneTimeSec: number): void {
  const look = INTRO_LOOK;
  drawRisingText(ctx, 'AGENT WRAPPED', 430, sceneTimeSec, 0.05, {
    size: 44,
    weight: 700,
    color: look.accent,
  });
  const yearPop = easeOutBack(progress(sceneTimeSec, 0.25, 0.55));
  drawText(ctx, String(data.year), 640, {
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
    ctx.fillText('npx agent-wrapped', 0, 2);
    ctx.restore();
  }
  drawRisingText(ctx, 'Get yours. 100% local.', 1130, sceneTimeSec, 1.45, {
    size: 38,
    weight: 400,
    color: look.text,
  });
}

function getLook(data: VideoData, sceneIndex: number): Look {
  if (sceneIndex === 0) return INTRO_LOOK;
  if (sceneIndex <= data.slides.length) return LOOKS[(sceneIndex - 1) % LOOKS.length] ?? INTRO_LOOK;
  return sceneIndex === data.slides.length + 1 ? MONTHS_LOOK : PERSONA_LOOK;
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
  ctx.fillText('agent-wrapped', 40, VIDEO_HEIGHT - 50);
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
