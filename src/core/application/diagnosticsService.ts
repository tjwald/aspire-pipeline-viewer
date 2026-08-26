import { parseDiagnostics } from '../domain/diagnosticsParser'
import { DiagnosticsFormatter, type OutputFormat } from '../domain/diagnosticsFormatter'
import type { PipelineGraph } from '../domain/types'
import type { DiagnosticsProvider } from '../ports/interfaces'

export class DiagnosticsService {
  private diagnosticsProvider?: DiagnosticsProvider

  constructor(diagnosticsProvider?: DiagnosticsProvider) {
    this.diagnosticsProvider = diagnosticsProvider
  }

  /**
   * Load and parse diagnostics from a directory using the injected provider
   */
  async loadDiagnostics(directory: string): Promise<PipelineGraph> {
    if (!this.diagnosticsProvider) {
      throw new Error('No DiagnosticsProvider configured in DiagnosticsService')
    }
    const raw = await this.diagnosticsProvider.getDiagnostics(directory)
    return parseDiagnostics(raw)
  }

  /**
   * Analyzes diagnostics text and returns a formatted pipeline
   * @param diagnosticsText Raw diagnostics output from `aspire do diagnostics`
   * @param format Output format (json or text)
   * @param stepFilter Optional step ID to filter by
   * @returns Formatted output string
   * @throws Error if parsing fails or step not found
   */
  static analyze(diagnosticsText: string, format: OutputFormat = 'json', stepFilter?: string): string {
    const graph = parseDiagnostics(diagnosticsText)
    return DiagnosticsFormatter.format(graph, format, stepFilter)
  }

  /**
   * Parses diagnostics and returns the raw pipeline graph
   * @param diagnosticsText Raw diagnostics output from `aspire do diagnostics`
   * @returns Parsed pipeline graph
   * @throws Error if parsing fails
   */
  static parse(diagnosticsText: string): PipelineGraph {
    return parseDiagnostics(diagnosticsText)
  }

  /**
   * Formats a pipeline graph with optional filtering
   * @param graph The pipeline graph to format
   * @param format Output format (json or text)
   * @param stepFilter Optional step ID to filter by
   * @returns Formatted output string
   * @throws Error if step not found
   */
  static format(graph: PipelineGraph, format: OutputFormat = 'json', stepFilter?: string): string {
    return DiagnosticsFormatter.format(graph, format, stepFilter)
  }
}
