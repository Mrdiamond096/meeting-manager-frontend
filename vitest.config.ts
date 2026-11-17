import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    // userEvent flows with several findBy waits (3s each, see setup.ts) need more than the 5s default under a parallel run.
    testTimeout: 15000,
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'], exclude: ['src/**/*.forks.test.*'] } },
      // *.forks.test.* change process-wide state (e.g. TZ) and run in their own process instead of a shared worker thread.
      { extends: true, test: { name: 'forks', include: ['src/**/*.forks.test.{ts,tsx}'], pool: 'forks' } },
    ],
  },
});
