# 3. The video is a self-contained HTML page

Date: 2026-11-15 · Status: accepted

## Context

A short animated clip with music is more shareable than a still image. Encoding a video inside the CLI needs ffmpeg or a headless browser on the user's machine, which breaks "one command, no setup".

## Decision

The CLI writes one HTML file that contains the data, the fonts and a small player. The browser draws the animation on a canvas, synthesizes the music and records both with `MediaRecorder` when the user presses "Save video".

## Consequences

- No native dependencies and no network. Works wherever a modern browser exists.
- Saving takes one click and as long as the clip (it records in real time).
- The file format depends on the browser: MP4 in Chrome and Safari, WebM in Firefox.
- Frame drawing and music are pure functions, so they are tested in Node and can be rendered headless for previews.
