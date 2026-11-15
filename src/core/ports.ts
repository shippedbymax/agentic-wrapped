import type { AgentId, UsageEvent } from './events/usage-event';
import type { Insight } from './insights/insight';
import type { WrappedStats } from './stats/wrapped-stats';

/** Everything an adapter may know about the machine. Injected, so adapters stay testable. */
export interface HostEnvironment {
  homeDir: string;
  env: Readonly<Record<string, string | undefined>>;
}

/** One log file that belongs to an agent. */
export interface LogSource {
  agentId: AgentId;
  path: string;
}

/** Called for every log line that could not be read. Adapters never throw on bad input. */
export type SkippedLineReporter = (reason: string) => void;

/** Port: turns one agent's local logs into normalized usage events. */
export interface AgentAdapter {
  id: AgentId;
  displayName: string;
  discover(host: HostEnvironment): Promise<LogSource[]>;
  parse(source: LogSource, onSkippedLine?: SkippedLineReporter): AsyncIterable<UsageEvent>;
}

/** Port: turns stats and insights into some output. */
export interface Renderer<TOutput> {
  id: string;
  render(report: WrappedReport): Promise<TOutput>;
}

/** Everything a renderer gets. */
export interface WrappedReport {
  stats: WrappedStats;
  insights: Insight[];
}
