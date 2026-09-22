import { defineConfig, configDefaults } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
  test: {
    testTimeout: 30_000,
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'dist'],
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['text', ['lcovonly', { projectRoot: '../..' }]]
        : ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-utils.ts', 'src/server.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
