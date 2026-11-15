import type { AgentAdapter, HostEnvironment, UsageEvent } from '../core';

export interface CollectResult {
  events: UsageEvent[];
  fileCountByAgent: Map<string, number>;
  skippedLineCount: number;
  unreadableFileCount: number;
}

/** Runs discover + parse for every adapter. One broken file never stops the run. */
export async function collectEvents(
  adapters: readonly AgentAdapter[],
  host: HostEnvironment,
): Promise<CollectResult> {
  const events: UsageEvent[] = [];
  const fileCountByAgent = new Map<string, number>();
  let skippedLineCount = 0;
  let unreadableFileCount = 0;

  for (const adapter of adapters) {
    const sources = await adapter.discover(host);
    fileCountByAgent.set(adapter.displayName, sources.length);
    for (const source of sources) {
      try {
        for await (const event of adapter.parse(source, () => {
          skippedLineCount += 1;
        })) {
          events.push(event);
        }
      } catch {
        unreadableFileCount += 1;
      }
    }
  }
  return { events, fileCountByAgent, skippedLineCount, unreadableFileCount };
}
