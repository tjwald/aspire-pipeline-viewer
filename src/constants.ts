/**
 * Application-wide constants and configuration
 */

// IPC Channel Names
export const IPC_CHANNELS = {
  SELECT_DIRECTORY: 'select-apphost-directory',
  GET_DIAGNOSTICS: 'get-apphost-diagnostics',
  RUN_STEP: 'run-aspire-do',
  OUTPUT: 'aspire-output',
  ERROR: 'aspire-error',
} as const

// UI Constants
export const UI = {
  WINDOW_WIDTH: 1200,
  WINDOW_HEIGHT: 800,
  SIDEBAR_WIDTH: 320,
  DAG_NODE_WIDTH: 200,
  DAG_NODE_HEIGHT: 80,
  DAG_LEVEL_WIDTH: 250,
  DAG_VERTICAL_GAP: 30,
  EXECUTION_PANEL_HEIGHT: 192, // max-h-48 in Tailwind
}

// Timeouts
export const TIMEOUTS = {
  TOAST_DURATION_SHORT: 3000,
  TOAST_DURATION_DEFAULT: 4000,
  TOAST_DURATION_LONG: 5000,
} as const

// Command Configuration
export const COMMANDS = {
  ASPIRE_DO_DIAGNOSTIC: ['aspire', 'do', 'diagnostic'],
  ASPIRE_DO_STEP: (step: string) => ['aspire', 'do', step],
} as const
