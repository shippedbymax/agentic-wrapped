import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { UsageEvent } from '../../core';
import { claudeCodeAdapter } from './index';

const FIXTURE_HOME = fileURLToPath(new URL('./fixtures', import.meta.url));
const HOST = { homeDir: FIXTURE_HOME, env: {} };

describe('claudeCodeAdapter', () => {
  it('discovers session logs under ~/.claude/projects', async () => {
    const sources = await claudeCodeAdapter.discover(HOST);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.agentId).toBe('claude-code');
  });

  it('honors CLAUDE_CONFIG_DIR and returns nothing for a missing folder', async () => {
    const host = { homeDir: FIXTURE_HOME, env: { CLAUDE_CONFIG_DIR: '/does/not/exist' } };
    expect(await claudeCodeAdapter.discover(host)).toEqual([]);
  });

  it('parses usage, skips synthetic and broken lines, and never leaks the project name', async () => {
    const [source] = await claudeCodeAdapter.discover(HOST);
    if (!source) throw new Error('fixture missing');
    const skippedReasons: string[] = [];
    const events: UsageEvent[] = [];
    for await (const event of claudeCodeAdapter.parse(source, (reason) =>
      skippedReasons.push(reason),
    )) {
      events.push(event);
    }

    // msg_001 appears twice in the log (one line per content block) with the same event id.
    expect(events.map((event) => event.eventId)).toEqual([
      'msg_001:req_001',
      'msg_001:req_001',
      'msg_002:req_002',
    ]);
    expect(events[0]).toMatchObject({
      agentId: 'claude-code',
      sessionId: '11111111-aaaa-4bbb-8ccc-000000000001',
      model: 'claude-sonnet-4-5-20250929',
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheWriteTokens: 5000,
    });
    expect(events[2]).toMatchObject({ cacheReadTokens: 6200, outputTokens: 800 });
    expect(events[0]?.projectHash).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(events)).not.toContain('acme');
    expect(skippedReasons).toEqual(['invalid JSON', 'unexpected assistant line shape']);
  });
});
