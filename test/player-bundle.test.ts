import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { bundlePlayer, toModuleSource } from '../scripts/build-player';

describe('player bundle', () => {
  it('is up to date with src/renderers/video/player (run `npm run build:player`)', async () => {
    const stored = await readFile(
      new URL('../src/renderers/video/player-bundle.generated.ts', import.meta.url),
      'utf8',
    );
    expect(stored).toBe(toModuleSource(await bundlePlayer()));
  });
});
