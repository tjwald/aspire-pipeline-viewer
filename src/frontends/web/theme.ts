/**
 * Theme and color configuration for UI components
 */

import type { ExecutionStatus } from '@/core'

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, { bg: string; text: string }> = {
  running: { bg: '#3b82f6', text: '#fff' },
  success: { bg: '#10b981', text: '#fff' },
  failed: { bg: '#ef4444', text: '#fff' },
  skipped: { bg: '#9ca3af', text: '#000' },
  pending: { bg: '#f5f5f5', text: '#000' },
}

export const TOAST_STYLES = {
  success: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
  error: { bg: 'bg-red-100', text: 'text-red-800', icon: '✕' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠' },
  info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'ℹ' },
} as const

export const STATUS_TEXT_COLORS: Record<string, string> = {
  Running: 'text-blue-600',
  Success: 'text-green-600',
  Failed: 'text-red-600',
  Skipped: 'text-gray-500',
  Pending: 'text-gray-400',
}
