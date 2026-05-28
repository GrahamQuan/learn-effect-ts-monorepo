import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/api/e2e',
  timeout: 30_000,
});
