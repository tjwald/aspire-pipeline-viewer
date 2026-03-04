/**
 * Service interfaces for dependency injection
 * Defines contracts that frontends implement to interact with platform-specific resources
 *
 * This file declares core shared types (including ParsedEvent) so the LogParser
 * can depend on these interfaces.
 */

export type ParsedEventType = 'line' | 'start' | 'success' | 'failure'

export interface ParsedEvent {
  timestamp: number
  stepName?: string
  type: ParsedEventType
  text: string
}

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

export interface IRunService extends IEventStream {
  startRun(stepName: string, graph?: import('../types/pipeline').PipelineGraph): Promise<string>
  stopRun(runId: string): Promise<void>
  renameRun(runId: string, name: string): Promise<void>
  getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>>
}

/**
 * Composition root for a frontend
 * Provides all service implementations
 */
export interface ServiceContainer {
  diagnosticsProvider: DiagnosticsProvider
  commandRunner: CommandRunner
  directoryChooser?: DirectoryChooser
  logger: Logger
}
