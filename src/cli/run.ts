import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { Command, InvalidArgumentError, Option } from 'commander';
import { ALL_ADAPTERS, getAdapter } from '../adapters/registry';
import {
  AGENT_IDS,
  type AgentId,
  DEFAULT_PRICE_TABLE,
  type HostEnvironment,
  PRICE_TABLE_UPDATED_AT,
  buildReport,
  buildShareText,
  describePeriod,
} from '../core';
import { imageRenderer } from '../renderers/image';
import { jsonRenderer } from '../renderers/json';
import { terminalRenderer } from '../renderers/terminal';
import { videoRenderer } from '../renderers/video';
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
  video: boolean;
  timeZone: string;
}

function parseYear(value: string): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new InvalidArgumentError('Expected a year like 2026.');
  }
  return year;
}

function parseTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    throw new InvalidArgumentError('Expected an IANA time zone like Europe/Berlin.');
  }
  return value;
}

/** Runs the CLI. Returns the process exit code. */
export async function runCli(argv: readonly string[], deps: CliDependencies): Promise<number> {
  const program = new Command()
    .name('agentic-wrapped')
    .description('Your year with AI coding agents, wrapped. 100% local.')
    .version(deps.version)
    .option('-y, --year <year>', 'year to wrap', parseYear, deps.now.getFullYear())
    .addOption(new Option('-a, --agent <agent...>', 'only these agents').choices([...AGENT_IDS]))
    .option('-o, --output <path>', 'where to save the image (the video goes next to it)')
    .option('--json', 'print the raw report as JSON instead', false)
    .option('--no-image', 'do not write an image')
    .option('--no-video', 'do not write the video player')
    .option('--time-zone <iana>', 'time zone for days and hours', parseTimeZone, deps.timeZone)
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
  deps.writeStdout(`  API value uses list prices as of ${PRICE_TABLE_UPDATED_AT}.\n\n`);

  const ignoredCount = collected.skippedLineCount + dropped.invalidCount;
  if (ignoredCount > 0 || collected.unreadableFileCount > 0) {
    deps.writeStderr(
      `  Skipped ${ignoredCount} unreadable log lines and ${collected.unreadableFileCount} files.\n`,
    );
  }

  const imagePath = resolve(options.output ?? `agentic-wrapped-${options.year}.png`);
  const videoPath = `${imagePath.slice(0, imagePath.length - extname(imagePath).length)}.html`;
  if (options.image || options.video) await mkdir(dirname(imagePath), { recursive: true });
  if (options.image) {
    await writeFile(imagePath, await imageRenderer.render(report));
    deps.writeStdout(`  Card:  ${imagePath}\n`);
  }
  if (options.video) {
    await writeFile(videoPath, await videoRenderer.render(report));
    deps.writeStdout(
      `  Video: ${videoPath}\n         Open it in your browser and press "Save video".\n`,
    );
  }
  if (options.image || options.video) deps.writeStdout('  Nothing left your machine.\n\n');

  const shareLines = buildShareText(report.stats).split('\n');
  deps.writeStdout(`  Post it:\n${shareLines.map((line) => `    ${line}`).join('\n')}\n\n`);

  const usesClaudeCode = report.stats.agents.some((agent) => agent.agentId === 'claude-code');
  if (describePeriod(report.stats).isPartial && usesClaudeCode) {
    deps.writeStdout(
      '  Tip: Claude Code deletes logs after 30 days by default. To wrap a longer time next\n' +
        '  run, set "cleanupPeriodDays": 365 in ~/.claude/settings.json.\n\n',
    );
  }
  return 0;
}
