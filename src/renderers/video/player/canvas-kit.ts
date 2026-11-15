import { BEAT_SEC, VIDEO_HEIGHT, VIDEO_WIDTH } from './timing';

/**
 * The small part of the Canvas 2D API the video uses, plus drawing helpers.
 * Keeping it this small lets the same code run in the browser and in Node.
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

export const CENTER_X = VIDEO_WIDTH / 2;
export const CENTER_Y = VIDEO_HEIGHT / 2;
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 120;
const FONT_FAMILY = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const TWO_PI = Math.PI * 2;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** Progress 0..1 of an animation that starts at `startSec` and takes `lengthSec`. */
export const progress = (timeSec: number, startSec: number, lengthSec: number) =>
  clamp01((timeSec - startSec) / lengthSec);
export const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
export const easeOutBack = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
/** 1 on every beat, then fades quickly. Makes things bounce to the music. */
export const beatPulse = (timeSec: number) => Math.exp(-7 * ((timeSec / BEAT_SEC) % 1));

export function setFont(ctx: SceneContext, weight: number, size: number): void {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT_FAMILY}`;
}

/** Draws centered text, shrinking the font until it fits the frame. */
export function drawText(
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
export function drawRisingText(
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
