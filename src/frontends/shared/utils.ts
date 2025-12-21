import type { PipelineGraph, PipelineStep } from '@aspire/core'

export type LayoutPositions = Record<string, { x: number; y: number }>

// Compute hierarchical layout levels via DFS
export function calculateLevels(graph: PipelineGraph): Record<string, number> {
  const levels: Record<string, number> = {}
  const visited = new Set<string>()

  function getLevel(stepId: string): number {
    if (visited.has(stepId)) return levels[stepId] ?? 0
    visited.add(stepId)

    const step = graph.steps.find((s) => s.id === stepId)
    if (!step || !step.dependencies || step.dependencies.length === 0) {
      levels[stepId] = 0
      return 0
    }

    const depLevels = step.dependencies.map((dep) => getLevel(dep))
    const level = Math.max(...depLevels) + 1
    levels[stepId] = level
    return level
  }

  graph.steps.forEach((s) => getLevel(s.id))
  return levels
}

export function calculateHierarchicalPositions(
  graph: PipelineGraph,
  width = 2000,
  xGap = 240,
  yGap = 150,
  nodeWidth = 180,
): LayoutPositions {
  const levels = calculateLevels(graph)
  const positions: LayoutPositions = {}
  const levelGroups: Record<number, PipelineStep[]> = {}

  Object.entries(levels).forEach(([id, level]) => {
    if (!levelGroups[level]) levelGroups[level] = []
    const step = graph.steps.find((s) => s.id === id)
    if (step) levelGroups[level].push(step)
  })

  Object.entries(levelGroups).forEach(([levelStr, nodes]) => {
    const level = Number(levelStr)
    const y = 50 + level * yGap
    const totalWidth = nodes.length * xGap
    const startX = Math.max(50, (width - totalWidth) / 2)

    nodes.forEach((step, idx) => {
      positions[step.id] = {
        x: startX + idx * xGap,
        y,
      }
    })
  })

  return positions
}

// Generate consistent muted colors for resources
export function getResourceColor(resource?: string | null): string {
  if (!resource) return '#607d8b'
  const base = resource.split(' ')[0].toLowerCase()
  const map: Record<string, string> = {
    app: '#d63031',
    frontend: '#0984e3',
    node: '#27ae60',
    prerequisites: '#e67e22',
  }
  if (map[base]) return map[base]
  const palette = ['#7f39fb', '#0891b2', '#6b7280', '#be123c']
  let hash = 0
  for (let i = 0; i < base.length; i++) hash = base.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export function wrapStepName(name: string, maxCharsPerLine = 10): string[] {
  if (name.length <= maxCharsPerLine) return [name]
  if (name.includes('-')) {
    const parts = name.split('-')
    const lines: string[] = []
    let current = ''
    for (const part of parts) {
      const next = current ? `${current}-${part}` : part
      if (next.length <= maxCharsPerLine) {
        current = next
      } else {
        if (current) lines.push(current)
        current = part
      }
    }
    if (current) lines.push(current)
    return lines
  }
  const lines: string[] = []
  for (let i = 0; i < name.length; i += maxCharsPerLine) {
    lines.push(name.substring(i, i + maxCharsPerLine))
  }
  return lines
}
