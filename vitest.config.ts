import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@aspire/core': path.resolve(__dirname, './src/core'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    watch: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
})
