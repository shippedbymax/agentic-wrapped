import type { VideoData } from '../video-data';
import { CENTER_X, CENTER_Y, type SceneContext, TWO_PI, beatPulse } from './canvas-kit';
import { VIDEO_HEIGHT, VIDEO_WIDTH } from './timing';

/** Colors and background pattern of each scene. */
type Motif = 'blobs' | 'rings' | 'stripes' | 'dots' | 'burst';
export interface Look {
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
export const INTRO_LOOK: Look = {
  background: '#12061f',
  text: '#ffffff',
  accent: '#c084fc',
  motif: 'blobs',
};
export const MONTHS_LOOK: Look = {
  background: '#1e3264',
  text: '#ffffff',
  accent: '#f037a5',
  motif: 'dots',
};
export const PERSONA_LOOK: Look = {
  background: '#7c3aed',
  text: '#ffffff',
  accent: '#cdf564',
  motif: 'burst',
};

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

export function drawBackground(ctx: SceneContext, look: Look, timeSec: number): void {
  ctx.fillStyle = look.background;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  drawMotif(ctx, look, timeSec);
}

export function getLook(data: VideoData, sceneIndex: number): Look {
  if (sceneIndex === 0) return INTRO_LOOK;
  if (sceneIndex <= data.slides.length) return LOOKS[(sceneIndex - 1) % LOOKS.length] ?? INTRO_LOOK;
  return sceneIndex === data.slides.length + 1 ? MONTHS_LOOK : PERSONA_LOOK;
}
