import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command, InvalidArgumentError, Option } from 'commander';
import { ALL_ADAPTERS, getAdapter } from '../adapters/registry';
import {
  AGENT_IDS,
  type AgentId,
  DEFAULT_PRICE_TABLE,
  type HostEnvironment,
  buildReport,
} from '../core';
import { imageRenderer } from '../renderers/image';
import { jsonRenderer } from '../renderers/json';
import { terminalRenderer } from '../renderers/terminal';
import { collectEvents } from './collect-events';

/** Everything the CLI needs from the outside world. Injected so the CLI is testable. */
export interface CliDependencies {
  host: HostEnvironment;
  now: Date;
  timeZone: string;
  version: string;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
}

interface CliOptions {
  year: number;
  agent?: AgentId[];
  output?: string;
  json: boolean;
  image: boolean;
  timeZone: string;
}

function parseYear(value: string): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new InvalidArgumentError('Expected a year like 2026.');
  }
  return year;
}

/** Runs the CLI. Returns the process exit code. */
export async function runCli(argv: readonly string[], deps: CliDependencies): Promise<number> {
  const program = new Command()
    .name('agent-wrapped')
    .description('Your year with AI coding agents, wrapped. 100% local.')
    .version(deps.version)
    .option('-y, --year <year>', 'year to wrap', parseYear, deps.now.getFullYear())
    .addOption(new Option('-a, --agent <agent...>', 'only these agents').choices([...AGENT_IDS]))
    .option('-o, --output <path>', 'where to save the image')
    .option('--json', 'print the raw report as JSON instead', false)
    .option('--no-image', 'do not write an image')
    .option('--time-zone <iana>', 'time zone for days and hours', deps.timeZone)
    .exitOverride()
    .configureOutput({ writeOut: deps.writeStdout, writeErr: deps.writeStderr });

  try {
    program.parse(argv, { from: 'user' });
  } catch (error) {
    const exitCode = (error as { exitCode?: number }).exitCode;
    return exitCode ?? 1;
  }
  const options = program.opts<CliOptions>();

  const adapters = options.agent ? options.agent.map(getAdapter) : ALL_ADAPTERS;
  const collected = await collectEvents(adapters, deps.host);
  const { report, dropped } = buildReport(collected.events, {
    year: options.year,
    timeZone: options.timeZone,
    priceTable: DEFAULT_PRICE_TABLE,
  });

  if (report.stats.totals.eventCount === 0) {
    const searched = [...collected.fileCountByAgent]
      .map(([agentName, fileCount]) => `${agentName}: ${fileCount} log files`)
      .join(', ');
    deps.writeStderr(`No agent activity found for ${options.year}. (${searched})\n`);
    return 1;
  }

  if (options.json) {
    deps.writeStdout(await jsonRenderer.render(report));
    return 0;
  }

  deps.writeStdout(await terminalRenderer.render(report));

  const ignoredCount = collected.skippedLineCount + dropped.invalidCount;
  if (ignoredCount > 0 || collected.unreadableFileCount > 0) {
    deps.writeStderr(
      `  Skipped ${ignoredCount} unreadable log lines and ${collected.unreadableFileCount} files.\n`,
    );
  }

  if (options.image) {
    const outputPath = resolve(options.output ?? `agent-wrapped-${options.year}.png`);
    await writeFile(outputPath, await imageRenderer.render(report));
    deps.writeStdout(
      `  Saved your card to ${outputPath}\n  Share it! Nothing left your machine.\n\n`,
    );
  }
  return 0;
}
