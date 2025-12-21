import type { PipelineGraph } from './types'

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
    const filteredGraph = this.filterByStep(graph, stepFilter)
    return format === 'json' ? this.formatJson(filteredGraph) : this.formatText(filteredGraph)
  }

  /**
   * Filters a graph to include only a specific step and its dependency chain
   * @param graph The pipeline graph
   * @param stepId Optional step ID to filter by
   * @returns Filtered graph or original graph if no filter
   */
  private static filterByStep(graph: PipelineGraph, stepId?: string): PipelineGraph {
    if (!stepId) {
      return graph
    }

    const requestedStep = graph.steps.find((s) => s.id === stepId)
    if (!requestedStep) {
      throw new Error(`Step not found: ${stepId}`)
    }

    // Build dependency chain recursively
    const includedSteps = new Set<string>()
    const toVisit = [stepId]

    while (toVisit.length > 0) {
      const current = toVisit.shift()!
      if (includedSteps.has(current)) continue
      includedSteps.add(current)

      const step = graph.steps.find((s) => s.id === current)
      if (step?.dependencies) {
        toVisit.push(...step.dependencies)
      }
    }

    // Filter steps and edges
    const filteredSteps = graph.steps.filter((s) => includedSteps.has(s.id))
    const filteredEdges = graph.edges.filter((e) => includedSteps.has(e.source) && includedSteps.has(e.target))

    return {
      ...graph,
      steps: filteredSteps,
      edges: filteredEdges,
    }
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
