import type { PipelineGraph } from './types/pipeline'
import { filterGraphForTarget } from './graphUtils'

export type OutputFormat = 'json' | 'text'

export class DiagnosticsFormatter {
  /**
   * Formats a pipeline graph with optional step filtering
   * @param graph The parsed pipeline graph
   * @param format Output format (json or text)
   * @param stepFilter Optional step ID to filter by (shows step and its dependencies)
   * @returns Formatted output string
   */
  static format(graph: PipelineGraph, format: OutputFormat, stepFilter?: string): string {
    const filteredGraph = stepFilter ? filterGraphForTarget(graph, stepFilter) : graph
    return format === 'json' ? this.formatJson(filteredGraph) : this.formatText(filteredGraph)
  }

  /**
   * Formats graph as JSON
   */
  private static formatJson(graph: PipelineGraph): string {
    return JSON.stringify(graph, null, 2)
  }

  /**
   * Formats graph as human-readable text
   */
  private static formatText(graph: PipelineGraph): string {
    let output = `\n📊 Pipeline: ${graph.name}\n`
    output += `ID: ${graph.id}\n`
    output += `Steps: ${graph.steps.length}\n`
    output += `Edges: ${graph.edges.length}\n\n`

    output += 'Steps:\n'
    for (const step of graph.steps) {
      output += `  • ${step.name} (${step.id})\n`
      if (step.description) {
        output += `    Description: ${step.description}\n`
      }
      if (step.resource) {
        output += `    Resource: ${step.resource}\n`
      }
      if (step.dependencies && step.dependencies.length > 0) {
        output += `    Dependencies: ${step.dependencies.join(', ')}\n`
      }
      if (step.tags && step.tags.length > 0) {
        output += `    Tags: ${step.tags.join(', ')}\n`
      }
      if (step.status !== undefined) {
        output += `    Status: ${step.status}\n`
      }
    }

    return output
  }
}
