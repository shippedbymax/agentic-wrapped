import type { VideoData } from '../video-data';

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1350;
export const VIDEO_FPS = 30;

const BEATS_PER_MINUTE = 96;
export const BEATS_PER_SCENE = 4;
export const BEAT_SEC = 60 / BEATS_PER_MINUTE;
/** One scene is exactly one bar of the beat, so every cut lands on the "one". */
export const SCENE_SEC = BEAT_SEC * BEATS_PER_SCENE;

/** Intro + one scene per slide + months chart + persona. */
export function countScenes(data: VideoData): number {
  return data.slides.length + 3;
}

export function getVideoDurationSec(data: VideoData): number {
  return countScenes(data) * SCENE_SEC;
}
