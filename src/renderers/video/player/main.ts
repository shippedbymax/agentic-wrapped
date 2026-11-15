/**
 * Browser entry of the video player. Bundled into one script by `npm run build:player`
 * and inlined into the HTML file. Everything here runs on the user's machine.
 */
import type { VideoData } from '../video-data';
import { renderBeat } from './beat';
import { type SceneContext, drawFrame } from './scene';
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, countScenes, getVideoDurationSec } from './timing';

declare global {
  interface Window {
    __AGENT_WRAPPED__: VideoData;
  }
}

/** X only takes MP4, so that comes first. WebM is the fallback (Firefox). */
const RECORDING_FORMATS = [
  { mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
] as const;

function getElement<TElement extends HTMLElement>(id: string): TElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as TElement;
}

const data = window.__AGENT_WRAPPED__;
const durationSec = getVideoDurationSec(data);
const canvas = getElement<HTMLCanvasElement>('stage');
const playButton = getElement<HTMLButtonElement>('play');
const saveButton = getElement<HTMLButtonElement>('save');
const statusLine = getElement<HTMLParagraphElement>('status');
const ctx = canvas.getContext('2d') as unknown as SceneContext;
canvas.width = VIDEO_WIDTH;
canvas.height = VIDEO_HEIGHT;

let audioContext: AudioContext | undefined;
let beatBuffer: AudioBuffer | undefined;
let isBusy = false;

function getAudio(): { context: AudioContext; buffer: AudioBuffer } {
  audioContext ??= new AudioContext();
  if (!beatBuffer) {
    const samples = renderBeat(audioContext.sampleRate, countScenes(data));
    beatBuffer = audioContext.createBuffer(1, samples.length, audioContext.sampleRate);
    beatBuffer.getChannelData(0).set(samples);
  }
  return { context: audioContext, buffer: beatBuffer };
}

function setBusy(busy: boolean, status: string): void {
  isBusy = busy;
  playButton.disabled = busy;
  saveButton.disabled = busy;
  statusLine.textContent = status;
}

/** Plays the clip once, in sync with the audio clock. Resolves when it is over. */
async function play(recordingTarget?: MediaStreamAudioDestinationNode): Promise<void> {
  const { context, buffer } = getAudio();
  await context.resume();
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  if (recordingTarget) source.connect(recordingTarget);
  const startTime = context.currentTime + 0.05;
  source.start(startTime);

  await new Promise<void>((resolve) => {
    const tick = () => {
      const timeSec = context.currentTime - startTime;
      drawFrame(ctx, timeSec, data);
      if (timeSec < durationSec) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  source.stop();
}

async function saveVideo(): Promise<void> {
  const format = RECORDING_FORMATS.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType));
  if (!format) {
    statusLine.textContent = 'This browser cannot record video. Try Chrome or Safari.';
    return;
  }
  const { context } = getAudio();
  const audioTarget = context.createMediaStreamDestination();
  const stream = canvas.captureStream(VIDEO_FPS);
  for (const track of audioTarget.stream.getAudioTracks()) stream.addTrack(track);

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    videoBitsPerSecond: 8_000_000,
  });
  recorder.ondataavailable = (event) => chunks.push(event.data);
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  await play(audioTarget);
  recorder.stop();
  await stopped;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(chunks, { type: format.mimeType }));
  link.download = `agent-wrapped-${data.year}.${format.extension}`;
  link.click();
  statusLine.textContent =
    format.extension === 'mp4'
      ? 'Saved. Go post it!'
      : 'Saved as WebM. X needs MP4: open this page in Chrome or Safari to get one.';
}

async function run(action: () => Promise<void>, status: string): Promise<void> {
  if (isBusy) return;
  setBusy(true, status);
  try {
    await action();
    setBusy(false, statusLine.textContent === status ? '' : (statusLine.textContent ?? ''));
  } catch (error) {
    setBusy(false, `Something went wrong: ${String(error)}`);
  }
}

playButton.addEventListener('click', () => run(() => play(), ''));
saveButton.addEventListener('click', () =>
  run(saveVideo, `Recording ${Math.round(durationSec)} seconds, keep this tab open...`),
);

// `#t=3.5` shows a single still frame. Handy for screenshots and for checking the design.
const stillTimeSec = Number(new URLSearchParams(location.hash.slice(1)).get('t') ?? Number.NaN);
document.fonts.ready.then(async () => {
  await Promise.all([400, 700, 800].map((weight) => document.fonts.load(`${weight} 40px Inter`)));
  drawFrame(ctx, Number.isNaN(stillTimeSec) ? durationSec : stillTimeSec, data);
  document.body.dataset.ready = 'true';
});
