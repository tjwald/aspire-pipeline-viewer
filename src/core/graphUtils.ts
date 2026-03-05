import type { PipelineGraph, PipelineEdge, PipelineStep } from './types/pipeline'

/**
 * Filter a pipeline graph to only include the steps required to reach a target step.
 * Includes the target step and all of its transitive dependencies.
 */
export function filterGraphForTarget(graph: PipelineGraph, targetStepId: string): PipelineGraph {
  const targetStep = graph.steps.find((step: PipelineStep) => step.id === targetStepId)
  if (!targetStep) {
    throw new Error(`Step not found: ${targetStepId}`)
  }

  const includedSteps = new Set<string>()
  const toVisit = [targetStepId]

  while (toVisit.length > 0) {
    const current = toVisit.pop() as string
    if (includedSteps.has(current)) {
      continue
    }
    includedSteps.add(current)

    const step = graph.steps.find((candidate: PipelineStep) => candidate.id === current)
    if (step?.dependencies) {
      step.dependencies.forEach((depId: string) => {
        if (!includedSteps.has(depId)) {
          toVisit.push(depId)
        }
      })
    }
  }

  const filteredSteps = graph.steps
    .filter((step: PipelineStep) => includedSteps.has(step.id))
    .map((step: PipelineStep) => ({
      ...step,
      dependencies: step.dependencies?.filter((depId: string) => includedSteps.has(depId)),
    }))

  const filteredEdges = graph.edges.filter(
    (edge: PipelineEdge) => includedSteps.has(edge.source) && includedSteps.has(edge.target),
  )

  return {
    ...graph,
    steps: filteredSteps,
    edges: filteredEdges,
  }
}
