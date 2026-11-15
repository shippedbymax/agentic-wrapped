import { mkdir, mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { UsageEvent } from '../../core';
import { cursorAdapter } from './index';
import { toProviderModelName } from './model-name';
import { NODE_TOO_OLD_MESSAGE } from './open-database';

// `node:sqlite` exists from Node 22.5 on. Older versions run the "too old" test instead.
const [nodeMajor = 0, nodeMinor = 0] = process.versions.node.split('.').map(Number);
const hasSqlite = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 5);

// Loaded with require: the test runner does not know this new built-in module yet.
const loadSqlite = () =>
  createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

let homeDir: string;
const databaseDir = () => join(homeDir, '.config', 'Cursor', 'User', 'globalStorage');
const host = () => ({ homeDir, platform: 'linux', env: {} });

async function parseAll(): Promise<{ events: UsageEvent[]; skipped: string[] }> {
  const [source] = await cursorAdapter.discover(host());
  if (!source) throw new Error('fixture database missing');
  const skipped: string[] = [];
  const events: UsageEvent[] = [];
  for await (const event of cursorAdapter.parse(source, (reason) => skipped.push(reason))) {
    events.push(event);
  }
  return { events, skipped };
}

beforeAll(async () => {
  homeDir = await mkdtemp(join(tmpdir(), 'agentic-wrapped-cursor-'));
  await mkdir(databaseDir(), { recursive: true });
  if (!hasSqlite) return;

  // Build a small database in Cursor's layout: one key-value table, one JSON value per message.
  const { DatabaseSync } = loadSqlite();
  const database = new DatabaseSync(join(databaseDir(), 'state.vscdb'));
  database.exec('CREATE TABLE cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)');
  const insert = database.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)');
  const bubble = (key: string, value: object) => insert.run(key, JSON.stringify(value));

  bubble('bubbleId:chat-1:b1', {
    type: 1,
    text: 'SECRET PROMPT',
    createdAt: '2026-03-09T09:00:00.000Z',
  });
  bubble('bubbleId:chat-1:b2', {
    type: 2,
    text: 'SECRET ANSWER',
    createdAt: '2026-03-09T09:00:20.000Z',
    modelInfo: { modelName: 'claude-4.5-sonnet-high-thinking' },
    tokenCount: { inputTokens: 0, outputTokens: 0 },
  });
  bubble('bubbleId:chat-1:b3', {
    type: 2,
    createdAt: '2026-03-09T09:05:00.000Z',
    tokenCount: { inputTokens: 1200, outputTokens: 340 },
  });
  // Older versions stored the time as epoch milliseconds.
  bubble('bubbleId:chat-2:b1', { type: 2, createdAt: Date.UTC(2026, 3, 2, 14, 0, 0) });
  // Rows the reader must ignore: no time, not JSON, a binary value, other key families.
  bubble('bubbleId:chat-2:b2', { type: 2 });
  insert.run('bubbleId:chat-2:b3', 'not json at all');
  insert.run('bubbleId:chat-2:b4', new Uint8Array([0, 159, 146, 150]));
  bubble('composerData:chat-1', { createdAt: 1, type: 2 });
  bubble('agentKv:blob:abc', { role: 'assistant', content: 'SECRET' });
  database.close();
});

describe('toProviderModelName', () => {
  it("translates Cursor's model names into the providers' names", () => {
    expect(toProviderModelName('claude-4.6-opus-high-thinking')).toBe('claude-opus-4-6');
    expect(toProviderModelName('claude-4.5-opus-high')).toBe('claude-opus-4-5');
    expect(toProviderModelName('claude-4-sonnet')).toBe('claude-sonnet-4');
    expect(toProviderModelName('gpt-5.4-medium')).toBe('gpt-5.4');
    expect(toProviderModelName('gpt-5.2')).toBe('gpt-5.2');
    expect(toProviderModelName('composer-2')).toBe('composer-2');
    for (const auto of [null, '', 'default', 'auto']) {
      expect(toProviderModelName(auto)).toBe('cursor-auto');
    }
  });
});

describe('cursorAdapter', () => {
  it('finds the database per platform and returns nothing when Cursor is not installed', async () => {
    expect(
      await cursorAdapter.discover({ homeDir: '/nowhere', platform: 'linux', env: {} }),
    ).toEqual([]);
    expect(
      await cursorAdapter.discover({
        homeDir: '/nowhere',
        platform: 'win32',
        env: { APPDATA: '/nope' },
      }),
    ).toEqual([]);
    expect(
      await cursorAdapter.discover({ homeDir: '/nowhere', platform: 'darwin', env: {} }),
    ).toEqual([]);
  });

  it.runIf(hasSqlite)(
    'reads AI replies with time, model and tokens, and nothing else',
    async () => {
      expect(await cursorAdapter.discover(host())).toHaveLength(1);
      const { events, skipped } = await parseAll();

      expect(events).toEqual([
        {
          eventId: 'bubbleId:chat-1:b2',
          agentId: 'cursor',
          sessionId: 'chat-1',
          timestamp: new Date('2026-03-09T09:00:20.000Z'),
          model: 'claude-sonnet-4-5',
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
        expect.objectContaining({
          eventId: 'bubbleId:chat-1:b3',
          model: 'cursor-auto',
          inputTokens: 1200,
          outputTokens: 340,
        }),
        expect.objectContaining({
          eventId: 'bubbleId:chat-2:b1',
          sessionId: 'chat-2',
          timestamp: new Date('2026-04-02T14:00:00.000Z'),
        }),
      ]);
      expect(skipped).toEqual([]);
      expect(JSON.stringify(events)).not.toContain('SECRET');
    },
  );

  it.runIf(hasSqlite)(
    'fails with a clear message when the file is not a Cursor database',
    async () => {
      const { DatabaseSync } = loadSqlite();
      const otherHome = await mkdtemp(join(tmpdir(), 'agentic-wrapped-cursor-bad-'));
      const otherDir = join(otherHome, '.config', 'Cursor', 'User', 'globalStorage');
      await mkdir(otherDir, { recursive: true });
      new DatabaseSync(join(otherDir, 'state.vscdb')).exec('CREATE TABLE something_else (id)');

      const [source] = await cursorAdapter.discover({
        homeDir: otherHome,
        platform: 'linux',
        env: {},
      });
      if (!source) throw new Error('fixture database missing');
      await expect(cursorAdapter.parse(source)[Symbol.asyncIterator]().next()).rejects.toThrow(
        'Cursor data could not be read',
      );
    },
  );

  it.runIf(!hasSqlite)('explains that Cursor needs a newer Node version', async () => {
    const source = { agentId: 'cursor' as const, path: join(databaseDir(), 'state.vscdb') };
    await expect(cursorAdapter.parse(source)[Symbol.asyncIterator]().next()).rejects.toThrow(
      NODE_TOO_OLD_MESSAGE,
    );
  });
});
