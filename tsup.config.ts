import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli/main.ts' },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  minify: false,
  banner: { js: '#!/usr/bin/env node' },
});
