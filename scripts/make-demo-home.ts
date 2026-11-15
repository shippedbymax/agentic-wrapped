/**
 * Dev-time only: writes a fake home folder with a year of made-up agent logs.
 * Used for the README demo video and for trying the CLI without real data.
 *
 * Usage: tsx scripts/make-demo-home.ts <target-dir> [year]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const targetDir = process.argv[2];
const year = Number(process.argv[3] ?? new Date().getFullYear());
if (!targetDir) throw new Error('Usage: tsx scripts/make-demo-home.ts <target-dir> [year]');

// Small seeded generator, so the demo is the same on every run.
let seed = 42;
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const randomInt = (min: number, max: number) => Math.floor(min + random() * (max - min + 1));

const claudeModels = ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101'];
const claudeDir = join(targetDir, '.claude', 'projects', '-demo-project');
await mkdir(claudeDir, { recursive: true });

for (let dayOfYear = 0; dayOfYear < 330; dayOfYear += 1) {
  if (random() < 0.3) continue;
  const month = Math.floor(dayOfYear / 30);
  const busyFactor = 1 + month / 4;
  const startHour = random() < 0.4 ? randomInt(21, 23) : randomInt(9, 18);
  const start = Date.UTC(year, 0, 1 + dayOfYear, startHour, randomInt(0, 59));

  const sessionId = `demo-claude-${dayOfYear}`;
  const lines: string[] = [];
  const callCount = Math.round(randomInt(8, 40) * busyFactor);
  for (let call = 0; call < callCount; call += 1) {
    lines.push(
      JSON.stringify({
        type: 'assistant',
        sessionId,
        timestamp: new Date(start + call * randomInt(20_000, 240_000)).toISOString(),
        cwd: '/demo/project',
        requestId: `req_${dayOfYear}_${call}`,
        message: {
          id: `msg_${dayOfYear}_${call}`,
          model: claudeModels[random() < 0.75 ? 0 : 1],
          usage: {
            input_tokens: randomInt(20, 2_000),
            output_tokens: randomInt(100, 3_000),
            cache_creation_input_tokens: randomInt(0, 8_000),
            cache_read_input_tokens: randomInt(20_000, 140_000),
          },
        },
      }),
    );
  }
  await writeFile(join(claudeDir, `${sessionId}.jsonl`), `${lines.join('\n')}\n`);

  if (random() < 0.35) {
    const codexDir = join(targetDir, '.codex', 'sessions', String(year), '01', '01');
    await mkdir(codexDir, { recursive: true });
    const codexLines = [
      JSON.stringify({
        timestamp: new Date(start).toISOString(),
        type: 'session_meta',
        payload: { id: `demo-codex-${dayOfYear}`, cwd: '/demo/project' },
      }),
      JSON.stringify({
        timestamp: new Date(start).toISOString(),
        type: 'turn_context',
        payload: { model: 'gpt-5.1-codex' },
      }),
    ];
    for (let call = 0; call < randomInt(5, 25); call += 1) {
      const inputTokens = randomInt(20_000, 90_000);
      codexLines.push(
        JSON.stringify({
          timestamp: new Date(start + call * 90_000).toISOString(),
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              last_token_usage: {
                input_tokens: inputTokens,
                cached_input_tokens: Math.round(inputTokens * 0.8),
                output_tokens: randomInt(200, 2_500),
              },
            },
          },
        }),
      );
    }
    await writeFile(
      join(codexDir, `rollout-demo-${dayOfYear}.jsonl`),
      `${codexLines.join('\n')}\n`,
    );
  }
}
console.log(`Demo home written to ${targetDir}`);
