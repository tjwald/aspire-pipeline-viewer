/**
 * Service interfaces for dependency injection
 * Defines contracts that frontends implement to interact with platform-specific resources
 */

export interface DiagnosticsProvider {
  /**
   * Get diagnostics output from Aspire
   * @param directory Path to AppHost project
   * @returns Diagnostics text output
   */
  getDiagnostics(directory: string): Promise<string>
}

export interface CommandRunner {
  /**
   * Run a command (e.g., aspire do <step>)
   * @param directory Working directory
   * @param command Command name (e.g., 'aspire')
   * @param args Command arguments
   * @returns Exit code and output
   */
  run(directory: string, command: string, args: string[]): Promise<{ code: number; output: string }>
}

export interface DirectoryChooser {
  /**
   * Show a dialog to select a directory
   * @param title Dialog title
   * @returns Selected path or null if cancelled
   */
  selectDirectory(title: string): Promise<string | null>
}

export interface Logger {
  /**
   * Log a message
   */
  log(message: string): void
  error(message: string): void
  warn(message: string): void
  debug(message: string): void
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
