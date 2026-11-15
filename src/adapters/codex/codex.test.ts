import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { UsageEvent } from '../../core';
import { codexAdapter } from './index';

const FIXTURE_HOME = fileURLToPath(new URL('./fixtures', import.meta.url));
const HOST = { homeDir: FIXTURE_HOME, platform: 'linux', env: {} };

describe('codexAdapter', () => {
  it('discovers rollout logs under ~/.codex/sessions and honors CODEX_HOME', async () => {
    expect(await codexAdapter.discover(HOST)).toHaveLength(1);
    expect(
      await codexAdapter.discover({
        homeDir: FIXTURE_HOME,
        platform: 'linux',
        env: { CODEX_HOME: '/nope' },
      }),
    ).toEqual([]);
  });

  it('uses the last call, skips repeated counters and falls back to the delta of totals', async () => {
    const [source] = await codexAdapter.discover(HOST);
    if (!source) throw new Error('fixture missing');
    const events: UsageEvent[] = [];
    for await (const event of codexAdapter.parse(source)) events.push(event);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      agentId: 'codex',
      sessionId: '22222222-aaaa-4bbb-8ccc-000000000002',
      model: 'gpt-5.1-codex',
      inputTokens: 6000, // 10000 input minus 4000 cached
      cacheReadTokens: 4000,
      outputTokens: 500,
      cacheWriteTokens: 0,
    });
    expect(events[1]).toMatchObject({
      model: 'gpt-5.1-codex-max',
      inputTokens: 5000, // (25000 - 10000) minus (14000 - 4000) cached
      cacheReadTokens: 10000,
      outputTokens: 1200,
    });
    expect(JSON.stringify(events)).not.toContain('acme');
  });
});
