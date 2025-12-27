import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@aspire-pipeline-viewer/core': path.resolve(__dirname, './src/core'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['tests/**/e2e/**/*.test.{ts,tsx}'],
  },
})
