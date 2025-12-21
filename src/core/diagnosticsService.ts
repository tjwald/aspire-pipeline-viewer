import { parseDiagnostics } from './diagnosticsParser'
import { DiagnosticsFormatter, type OutputFormat } from './diagnosticsFormatter'
import type { PipelineGraph } from './types'

export class DiagnosticsService {
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
