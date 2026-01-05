/// <reference types="vite/client" />

import type { ParsedEvent } from '@aspire-pipeline-viewer/core'

interface RunOutputEvent {
  runId: string
  event: ParsedEvent
}

interface RunStatusChangeEvent {
  runId: string
  status: 'running' | 'success' | 'failed'
}

interface ElectronAPI {
  selectApphostDirectory: () => Promise<string | null>
  getApphostDiagnostics: (directory: string) => Promise<{ code: number; output: string }>
  runAspireDo: (directory: string, step: string) => Promise<{ code: number; output: string }>
  onAspireOutput: (cb: (data: string) => void) => () => void
  onAspireError: (cb: (data: string) => void) => () => void
  // Run management APIs
  runStep: (runId?: string) => Promise<string>
  killRun: (runId: string) => Promise<void>
  renameRun: (runId: string, newName: string) => Promise<void>
  onRunOutput: (cb: (data: RunOutputEvent) => void) => () => void
  onRunStatusChange: (cb: (data: RunStatusChangeEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
