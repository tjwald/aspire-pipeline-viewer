import type { PipelineGraph, PipelineStep, ParsedEvent } from './types'

/** Strip ANSI SGR sequences and normalize for step-name comparison. */
export function normalizeStepToken(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u001b\[[0-9;]*m/g, '').trim().toLowerCase()
}

/** Build a lookup from every known alias (id and display name) of a step to its canonical id. */
export function buildStepAliasMap(graph: PipelineGraph): Record<string, string> {
  const map: Record<string, string> = {}
  graph.steps.forEach((step: PipelineStep) => {
    map[normalizeStepToken(step.id)] = step.id
    map[normalizeStepToken(step.name)] = step.id
  })
  return map
}

/**
 * Resolve an Aspire log line's step name to a canonical graph step id.
 * Falls back to a substring match against known aliases when there is no exact hit.
 */
export function resolveStepId(aliasMap: Record<string, string>, stepName: string | undefined): string | undefined {
  if (!stepName) return undefined
  const normalized = normalizeStepToken(stepName)
  if (aliasMap[normalized]) return aliasMap[normalized]

  const fallback = Object.entries(aliasMap).find(([alias]) => alias.includes(normalized))
  return fallback?.[1]
}

/** Derive the next step status for a given step from a parsed event, or undefined if unchanged. */
export function nextStepStatus(
  currentStatus: string | undefined,
  eventType: ParsedEvent['type']
): 'pending' | 'running' | 'success' | 'failed' | undefined {
  if (eventType === 'start') {
    return currentStatus === 'pending' || currentStatus === undefined ? 'running' : undefined
  }
  if (eventType === 'success') return 'success'
  if (eventType === 'failure') return 'failed'
  return undefined
}
