# Contributing

Thanks for helping. The two most useful contributions are **a new agent** and **a new card**.

## Setup

```bash
npm install
npm run check        # lint, layer rules, types, tests, build
npm run dev -- --year 2026
```

Try it without real data:

```bash
npx tsx scripts/make-demo-home.ts /tmp/demo-home 2026
HOME=/tmp/demo-home npm run dev
```

## Add an agent

Follow [docs/ADDING_AN_AGENT.md](docs/ADDING_AN_AGENT.md). You only touch `src/adapters/` and one line in `src/core/events/usage-event.ts`.

## Add a card

Add one rule to `src/core/insights/build-insights.ts` and a test next to it. To show it on the image, add its id to `TILE_INSIGHT_IDS` in `src/renderers/image/build-card.ts`.

## Rules

- **Never add network code.** The build fails if you do.
- **Never put prompts, code or file names into a `UsageEvent`.** Numbers only.
- **Fixtures must be anonymous.** Replace all content with `"redacted"` and use made-up ids and paths.
- Adapters never throw on a bad log line. Skip it and report it.
- Naming: files `kebab-case`, functions `camelCase` starting with a verb, types `PascalCase`, constants `SCREAMING_SNAKE_CASE`, units in the name (`durationMs`, `costUsd`).
- Commits follow [Conventional Commits](https://www.conventionalcommits.org), e.g. `feat(adapter-cursor): parse usage`.
