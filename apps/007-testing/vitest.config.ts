import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/00-testing/test/setup.ts'],
  },
});
