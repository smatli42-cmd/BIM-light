import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}', 'tools/**/*.test.mjs'],
    environment: 'node',
    // Testy nad ukázkovým domem (stavba celého modelu příkazy) trvají pod zátěží přes výchozích 5 s.
    testTimeout: 20_000,
  },
});
