import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // userEvent flows with several findBy waits (3s each, see setup.ts) need more than the 5s default under a parallel run.
    testTimeout: 15000,
    // *.forks.test.* change process-wide state (e.g. TZ) and run in their own process instead of a shared worker thread.
    poolMatchGlobs: [['**/*.forks.test.*', 'forks']],
  },
});
