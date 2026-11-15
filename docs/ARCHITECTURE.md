# Architecture

agentic-wrapped is a one-way pipeline built as **ports and adapters**: the stable part sits in the middle, everything that changes sits outside.

```text
          adapters                      core (pure)                     renderers
 ┌───────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────┐
 │ claude-code  discover │   │ normalize -> price ->        │   │ terminal         │
 │ codex        parse    │──▶│ aggregate -> insights        │──▶│ image (PNG)      │
 │ (your agent here)     │   │                              │   │ json · video     │
 └───────────────────────┘   └──────────────────────────────┘   └──────────────────┘
        UsageEvent[]                  WrappedReport
                         cli wires the three together
```

## Layers

| Folder | Job | May import |
| --- | --- | --- |
| `src/core` | Types, pricing, stats, insights. No files, no network, no clock. | Nothing outside `src/core` |
| `src/adapters` | Find and read one agent's logs. | `core`, Node built-ins, `zod` |
| `src/renderers` | Turn a report into output. | `core`, rendering packages |
| `src/cli` | Read flags, wire everything, write files. | Everything |

Dependencies point inwards only. `npm run lint:layers` (dependency-cruiser) fails the build on a wrong import, on an adapter importing another adapter, and on cycles.

## The three contracts

All of them live in `src/core`:

- **`UsageEvent`** (`events/usage-event.ts`): one model call as numbers. No field for prompts or code.
- **`AgentAdapter`** (`ports.ts`): `discover(host)` finds log files, `parse(source)` streams events.
- **`Renderer<TOutput>`** (`ports.ts`): `render(report)` returns the output.

## Pipeline

1. **Discover** (adapter): list the agent's log files. A missing folder is an empty list, not an error.
2. **Parse** (adapter): stream each file line by line and yield `UsageEvent`s. Bad lines are skipped and reported.
3. **Normalize** (core): drop invalid events, duplicates and events outside the year; sort by time.
4. **Price** (core): look up the model in the bundled price table. Unknown models are reported, not priced as zero silently.
5. **Aggregate** (core): `computeStats` builds one `WrappedStats` object.
6. **Insights** (core): one small rule per card turns stats into `Insight`s.
7. **Render** (renderer): terminal text, a PNG card, a video page, or JSON.

`buildReport` in `src/core/build-report.ts` runs steps 3 to 6.

## Decisions

- **Pure core.** Year, time zone and prices are passed in. Same input, same output, so tests need no mocks.
- **Injected environment.** Adapters get `HostEnvironment` (home folder, env vars) and the CLI gets `CliDependencies` (clock, output). Tests run against fixture folders.
- **Streaming.** Log files can be gigabytes. Adapters read line by line and pre-filter with a cheap string check before `JSON.parse`.
- **Tokens are optional.** Some agents (Cursor) log no token counts. Their events carry zeros, and insights, card and video switch from tokens to replies when the whole report has no tokens.
- **Validate at the edge.** Raw log lines are checked with zod in the adapter. Inside the core, types are trusted.
- **Local by construction.** No network code exists, and `test/no-network.test.ts` keeps it that way. Prices are a bundled snapshot, refreshed at development time with `npm run update-pricing`.
- **No browser for the image.** satori builds an SVG from a plain element tree, resvg turns it into a PNG.

## The video

`src/renderers/video` writes one self-contained HTML file. Three pure pieces do the work, and they run both in the browser and in Node:

- `player/scene.ts`: `drawFrame(ctx, timeSec, data)` draws one frame on a Canvas 2D context. Same time, same picture.
- `player/beat.ts`: `renderBeat(sampleRate, barCount)` synthesizes the soundtrack as raw samples. No audio files.
- `player/timing.ts`: one scene is one bar of the beat (96 BPM, 2.5 s), so every cut lands on the beat.

`player/main.ts` is the only browser-specific file: it plays the samples, draws frames against the audio clock and records canvas plus audio with `MediaRecorder` for "Save video". `npm run build:player` bundles the player into `player-bundle.generated.ts`; a test fails if that file is out of date. `scripts/render-preview.ts` renders the same clip without a browser (canvas for Node plus ffmpeg), which is how the design is checked.

Longer notes live in [`docs/adr`](adr).
