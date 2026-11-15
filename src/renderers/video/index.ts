import type { Renderer, WrappedReport } from '../../core';
import { INTER_FONT_WEIGHTS, readInterFont } from '../shared/inter-font';
import { PLAYER_SCRIPT } from './player-bundle.generated';
import { type VideoData, buildVideoData } from './video-data';

async function buildFontFaces(): Promise<string> {
  const faces = await Promise.all(
    INTER_FONT_WEIGHTS.map(async (weight) => {
      const font = await readInterFont(weight);
      return `@font-face{font-family:Inter;font-weight:${weight};src:url(data:font/woff;base64,${font.toString('base64')}) format("woff")}`;
    }),
  );
  return faces.join('\n');
}

/** The only external reference on the page. Nothing is loaded from it; it opens on click. */
export const REPOSITORY_URL = 'https://github.com/shippedbymax/agentic-wrapped';

/** JSON that is safe inside a <script> tag. */
function toInlineJson(data: VideoData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function buildVideoPage(data: VideoData, fontFaces: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agentic Wrapped ${data.year}</title>
<style>
${fontFaces}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;background:#0b0b12;color:#f5f5fa;font-family:Inter,system-ui,sans-serif}
canvas{height:min(62vh,125vw);aspect-ratio:4/5;border-radius:20px;background:#12061f}
.controls{display:flex;gap:12px}
button{font:700 18px Inter,system-ui,sans-serif;padding:14px 26px;border:0;border-radius:999px;cursor:pointer;background:#cdf564;color:#0b0b12}
button.secondary{background:#26263a;color:#f5f5fa}
button:disabled{opacity:.5;cursor:default}
p{margin:0;min-height:1.4em;color:#8b8ba7;font-size:15px}
.share{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(100%,460px)}
a{color:#cdf564;font:700 15px Inter,system-ui,sans-serif;text-decoration:none}
a:hover{text-decoration:underline}
textarea{width:100%;resize:none;padding:14px;border:1px solid #26263a;border-radius:14px;background:#161625;color:#f5f5fa;font:400 15px/1.45 Inter,system-ui,sans-serif}
</style>
</head>
<body>
<canvas id="stage"></canvas>
<div class="controls">
<button id="play" type="button">Play with sound</button>
<button id="save" type="button" class="secondary">Save video</button>
</div>
<p id="status"></p>
<div class="share">
<textarea id="share-text" readonly rows="6"></textarea>
<button id="copy" type="button" class="secondary">Copy post text</button>
</div>
<a href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer">★ Like it? Star agentic-wrapped on GitHub</a>
<script>window.__AGENTIC_WRAPPED__=${toInlineJson(data)};</script>
<script>${PLAYER_SCRIPT.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
}

/**
 * Renders the animated clip as one self-contained HTML file: open it, press play,
 * press "Save video". No server, no external files, nothing is uploaded.
 */
export const videoRenderer: Renderer<string> = {
  id: 'video',
  render: async (report: WrappedReport) =>
    buildVideoPage(buildVideoData(report), await buildFontFaces()),
};
