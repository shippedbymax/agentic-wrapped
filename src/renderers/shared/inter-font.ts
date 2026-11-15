import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

export const INTER_FONT_WEIGHTS = [400, 700, 800] as const;
export type InterFontWeight = (typeof INTER_FONT_WEIGHTS)[number];

const require = createRequire(import.meta.url);

/** Reads the Inter font file (WOFF, latin) that ships with the `@fontsource/inter` dependency. */
export function readInterFont(weight: InterFontWeight): Promise<Buffer> {
  return readFile(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));
}
