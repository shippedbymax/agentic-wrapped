/**
 * Dev-time only: renders the video without a browser, for the README and for checking the design.
 * Needs ffmpeg on the PATH for the full video.
 *
 * Usage:
 *   tsx scripts/render-preview.ts frames <out-dir> <time-sec...>   # PNG stills
 *   tsx scripts/render-preview.ts video <out.mp4>                  # full clip with sound
 * Reads the report from `agent-wrapped --json` on stdin.
 */
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import type { WrappedReport } from '../src/core';
import { renderBeat } from '../src/renderers/video/player/beat';
import { type SceneContext, drawFrame } from '../src/renderers/video/player/scene';
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  countScenes,
  getVideoDurationSec,
} from '../src/renderers/video/player/timing';
import { buildVideoData } from '../src/renderers/video/video-data';

const SAMPLE_RATE = 44_100;
const require = createRequire(import.meta.url);
for (const weight of [400, 700, 800]) {
  GlobalFonts.registerFromPath(
    require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`),
    'Inter',
  );
}

async function readStdin(): Promise<string> {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function encodeWav(samples: Float32Array): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2);
  });
  return buffer;
}

const [mode, target, ...rest] = process.argv.slice(2);
if (!mode || !target) throw new Error('See the usage note at the top of this file.');

const data = buildVideoData(JSON.parse(await readStdin()) as WrappedReport);
const canvas = createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
const ctx = canvas.getContext('2d') as unknown as SceneContext;

if (mode === 'frames') {
  await mkdir(target, { recursive: true });
  for (const time of rest) {
    drawFrame(ctx, Number(time), data);
    await writeFile(join(target, `frame-${time}.png`), canvas.toBuffer('image/png'));
  }
} else {
  const wavPath = join(tmpdir(), `agent-wrapped-beat-${process.pid}.wav`);
  await writeFile(wavPath, encodeWav(renderBeat(SAMPLE_RATE, countScenes(data))));
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
      '-r',
      String(VIDEO_FPS),
      '-i',
      'pipe:0',
      '-i',
      wavPath,
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      '+faststart',
      '-shortest',
      target,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const frameCount = Math.round(getVideoDurationSec(data) * VIDEO_FPS);
  for (let frame = 0; frame < frameCount; frame += 1) {
    drawFrame(ctx, frame / VIDEO_FPS, data);
    const pixels = Buffer.from(canvas.data());
    if (!ffmpeg.stdin.write(pixels)) await new Promise((done) => ffmpeg.stdin.once('drain', done));
  }
  ffmpeg.stdin.end();
  const exitCode = await new Promise<number>((done) => ffmpeg.on('close', done));
  await rm(wavPath, { force: true });
  if (exitCode !== 0) throw new Error(`ffmpeg failed with exit code ${exitCode}`);
  console.log(`Wrote ${target}`);
}
