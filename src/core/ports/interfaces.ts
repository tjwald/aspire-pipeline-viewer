import type { PipelineGraph, ParsedEvent } from '../domain/types'

export interface DiagnosticsProvider {
  getDiagnostics(directory: string): Promise<string>
}

export interface CommandRunner {
  run(directory: string, command: string, args: string[]): Promise<{ code: number; output: string }>
}

export interface DirectoryChooser {
  selectDirectory(title: string): Promise<string | null>
}

export interface Logger {
  log(message: string): void
  error(message: string): void
  warn(message: string): void
  debug(message: string): void
}

export interface IEventStream {
  on(event: 'event', listener: (payload: { runId: string; event: ParsedEvent }) => void): void
  off(event: 'event', listener: (payload: { runId: string; event: ParsedEvent }) => void): void
  emit?(event: 'event', payload: { runId: string; event: ParsedEvent }): void
}

export interface RunMeta {
  runId: string
  name?: string
  startedAt: number
  logPath: string
  targetStepId?: string
  status: 'running' | 'success' | 'failed'
}

export interface RunDetails {
  meta: RunMeta
  graph?: PipelineGraph | null
  logs: ParsedEvent[]
  nodeStatuses?: Record<string, 'pending' | 'running' | 'success' | 'failed'>
}

export interface IRunService extends IEventStream {
  startRun(stepName: string, graph?: PipelineGraph): Promise<string>
  stopRun(runId: string): Promise<void>
  renameRun(runId: string, name: string): Promise<void>
  getRunDetails?(runId: string): Promise<RunDetails | null>
  getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>>
  getRunsDirectory(): Promise<string>
}

/**
 * Composition root container providing service implementations
 */
export interface ServiceContainer {
  diagnosticsProvider?: DiagnosticsProvider
  commandRunner?: CommandRunner
  directoryChooser?: DirectoryChooser
  runService?: IRunService
  logger?: Logger
}

/**
 * Platform capabilities contract for UI consumption
 */
export interface PipelineViewerCapabilities {
  canSelectWorkspace: boolean
  canRunSteps: boolean
  canViewHistory: boolean
  selectWorkspace?(): Promise<string | null>
  getDiagnostics(directory: string): Promise<{ code: number; output: string }>
  runStep?(stepName: string, graph?: PipelineGraph): Promise<string>
  killRun?(runId: string): Promise<void>
  renameRun?(runId: string, name: string): Promise<void>
  getRunDetails?(runId: string): Promise<RunDetails | null>
  getRunHistory?(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>>
  getRunsDirectory?(): Promise<string>
  showTabContextMenu?(): Promise<string | null>
  onRunOutput?(cb: (data: { runId: string; event: ParsedEvent }) => void): () => void
  onRunStatusChange?(cb: (data: { runId: string; status: string; nodeStatuses?: Record<string, string> }) => void): () => void
}
