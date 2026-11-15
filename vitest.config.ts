import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Rendering the card takes a few seconds on slow CI machines.
    testTimeout: 30_000,
  },
});
