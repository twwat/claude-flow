/**
 * @claude-flow/cache-optimizer Vitest Configuration
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.spec.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        '**/__tests__/**',
      ],
    },
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15000,
    globals: true,
  },
});
