import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/01-runtime/test/setup.ts'],
  },
});
