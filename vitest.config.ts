import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@aspire/core': path.resolve(__dirname, './src/core'),
      '@aspire/shared': path.resolve(__dirname, './src/frontends/shared'),
      '@aspire/shared/components': path.resolve(__dirname, './src/frontends/shared/components'),
      '@aspire/shared/components/*': path.resolve(__dirname, './src/frontends/shared/components/*'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    watch: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    setupFiles: ['./tests/setup.ts'],
  },
})
