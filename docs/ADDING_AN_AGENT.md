# Adding an agent

A new agent is one folder. Use `src/adapters/codex` as a template.

1. **Register the id.** Add it to `AGENT_IDS` in `src/core/events/usage-event.ts` and its display name to `AGENT_DISPLAY_NAMES` in `src/core/insights/format.ts`. TypeScript now tells you what is missing.
2. **Create the folder** `src/adapters/<agent-id>/` with:
   - `discover.ts`: find the log files. Support the agent's env var for a custom folder if it has one.
   - `schema.ts`: a zod schema for the lines you read. Only the fields you need.
   - `parse.ts`: stream the file with `readLines`, validate, and `yield` `UsageEvent`s.
   - `index.ts`: export `<agentId>Adapter`.
   - `fixtures/`: a small, anonymous sample log in the real folder layout.
   - `<agent-id>.test.ts`: discover and parse the fixture, assert the exact events.
3. **Register the adapter** in `src/adapters/registry.ts`.
4. **Add model prices** if the agent uses a new provider: extend `PROVIDERS` in `scripts/update-pricing.ts` and run `npm run update-pricing`.
5. Run `npm run check`.

## Things to get right

- **`eventId`** must be the same when the same model call shows up twice (resumed or forked sessions, one line per content block). Duplicates are dropped by this id.
- **Token kinds.** `inputTokens` is fresh input only. If the provider counts cached tokens inside its input number, subtract them and put them in `cacheReadTokens`.
- **Cumulative counters.** If the log holds running totals, yield the difference between two lines, not the total.
- **Never throw on a bad line.** Call `onSkippedLine(reason)` and continue.
- **No content.** Do not read prompts, answers, tool output or file names. Hash the project path with `hashProject`.
