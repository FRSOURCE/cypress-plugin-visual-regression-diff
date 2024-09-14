import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

const exludeFiles = [...configDefaults.exclude, 'example', '.yarn', '*.js'];
const testsGlob = 'src/**.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}';

const isCI = !!process.env.CI;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: exludeFiles,
    include: [testsGlob],
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['text', ['lcovonly', { projectRoot: '../..' }]]
        : ['text', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    alias: {
      '@fixtures/*': path.resolve(__dirname, '__tests__', 'partials'),
      '@mocks/*': path.resolve(__dirname, '__tests__', 'mocks'),
    },
  },
});
