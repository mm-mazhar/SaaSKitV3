// vitest.config.ts

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    // Without this, `**/*.test.ts` also matches any git worktree checked
    // out under the repo (e.g. .kilo/worktrees/<branch>/tests/...), which
    // Kilo Code creates inside the project tree and .gitignore hides from
    // git but NOT from vitest's file glob. That silently ran a second,
    // identical copy of the entire integration suite in parallel against
    // the same live Supabase database on every `vitest run` -- which is
    // what was actually behind the handful of "random" 30s test timeouts
    // and hook timeouts seen in recent runs (two copies of e.g.
    // disposable-email-blocking.test.ts hammering the same DB at once),
    // not database load or a logic bug in the tests themselves.
    exclude: ['**/node_modules/**', '**/.kilo/**', '**/.git/**', '**/dist/**', '**/.next/**'],
    setupFiles: ['tests/integration/env-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'app/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    },
    testTimeout: 30000, // Increased timeout for database operations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
