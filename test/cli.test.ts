import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { type CliDependencies, runCli } from '../src/cli/run';

const FIXTURE_DIRS = ['claude-code', 'codex'].map((agent) =>
  fileURLToPath(new URL(`../src/adapters/${agent}/fixtures`, import.meta.url)),
);

let homeDir: string;

beforeAll(async () => {
  homeDir = await mkdtemp(join(tmpdir(), 'agent-wrapped-home-'));
  for (const fixtureDir of FIXTURE_DIRS) await cp(fixtureDir, homeDir, { recursive: true });
});

async function run(args: string[]) {
  let stdout = '';
  let stderr = '';
  const deps: CliDependencies = {
    host: { homeDir, env: {} },
    now: new Date('2026-12-01T12:00:00Z'),
    timeZone: 'UTC',
    version: '0.0.0-test',
    writeStdout: (text) => {
      stdout += text;
    },
    writeStderr: (text) => {
      stderr += text;
    },
  };
  const exitCode = await runCli(args, deps);
  return { exitCode, stdout, stderr };
}

describe('agent-wrapped CLI', () => {
  it('--json prints deduplicated totals across both agents', async () => {
    const { exitCode, stdout } = await run(['--json']);
    expect(exitCode).toBe(0);
    const { stats } = JSON.parse(stdout);
    // Claude Code: 6500 + 7050 (duplicate line counted once). Codex: 10500 + 16200.
    expect(stats.totals.totalTokens).toBe(6500 + 7050 + 10500 + 16200);
    expect(stats.sessionCount).toBe(2);
    expect(stats.projectCount).toBe(1);
    expect(stats.unpricedModels).toEqual([]);
    expect(stats.totals.costUsd).toBeGreaterThan(0);
  });

  it('writes the card and prints the summary by default', async () => {
    const outputPath = join(homeDir, 'card.png');
    const { exitCode, stdout, stderr } = await run(['--output', outputPath]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Total tokens');
    expect(stdout).toContain(outputPath);
    expect(stderr).toContain('Skipped 2 unreadable log lines');
    expect((await readFile(outputPath)).subarray(1, 4).toString()).toBe('PNG');
    const videoPage = await readFile(join(homeDir, 'card.html'), 'utf8');
    expect(videoPage).toContain('<canvas id="stage">');
    expect(stdout).toContain(join(homeDir, 'card.html'));
  });

  it('--agent limits the run to one agent', async () => {
    const { stdout } = await run(['--json', '--agent', 'codex']);
    expect(JSON.parse(stdout).stats.agents).toHaveLength(1);
  });

  it('exits with 1 and a clear message when there is no activity', async () => {
    const { exitCode, stderr } = await run(['--year', '2024', '--no-image', '--no-video']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('No agent activity found for 2024');
  });

  it('rejects a bad year', async () => {
    expect((await run(['--year', 'soon'])).exitCode).toBe(1);
  });
});
