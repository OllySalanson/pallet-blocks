import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // This project is often worked on alongside other heavy jobs: keep the
    // runner small.
    maxWorkers: 2,
  },
});
