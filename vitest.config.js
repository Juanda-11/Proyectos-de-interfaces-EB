import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/server.js'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
    },
  },
})
