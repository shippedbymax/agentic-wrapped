import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findFiles } from '../src/adapters/shared/find-files';

/**
 * The README promises "100% local". This test keeps that promise honest:
 * no shipped source file may reach for the network.
 */
const FORBIDDEN_PATTERNS = [
  /from\s+['"](node:)?(http|https|http2|net|tls|dgram|dns)['"]/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /from\s+['"](axios|got|node-fetch|undici|ky)['"]/,
];

describe('100% local', () => {
  it('has no network code in src/', async () => {
    const srcDir = fileURLToPath(new URL('../src', import.meta.url));
    const sourcePaths = (await findFiles(srcDir, '.ts')).filter(
      (path) => !path.endsWith('.test.ts'),
    );
    expect(sourcePaths.length).toBeGreaterThan(10);

    const offenders: string[] = [];
    for (const sourcePath of sourcePaths) {
      const sourceText = await readFile(sourcePath, 'utf8');
      if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(sourceText)))
        offenders.push(sourcePath);
    }
    expect(offenders).toEqual([]);
  });
});
