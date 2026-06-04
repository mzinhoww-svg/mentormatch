import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Node is the default; UI component tests opt into a DOM via the *.dom.test
    // naming convention (see environmentMatchGlobs below).
    environment: 'node',
    // Disable the in-process TTL caches under test so integration tests always
    // read straight from the DB (no cross-test staleness). The cache mechanics
    // are covered directly by ttlCache.test.ts.
    env: { MM_TENANT_CACHE_TTL_MS: '0', MM_SETTINGS_CACHE_TTL_MS: '0' },
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['**/*.dom.test.{ts,tsx}', 'happy-dom']],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/index.ts'],
    },
  },
});
