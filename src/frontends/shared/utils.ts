import type { PipelineGraph, PipelineStep } from '@aspire/core'

export type LayoutPositions = Record<string, { x: number; y: number }>

export type ResourceColumn = {
  name: string
  displayName: string
  centerX: number
  startX: number
  width: number
  color: string
}

export type CenterLane = {
  centerX: number
  width: number
  startX: number
}

// Compute depth from roots (steps with no dependencies = depth 0)
function calculateDepthFromRoots(graph: PipelineGraph): Record<string, number> {
  const depths: Record<string, number> = {}
  const visited = new Set<string>()

  function getDepth(stepId: string): number {
    if (depths[stepId] !== undefined) return depths[stepId]
    if (visited.has(stepId)) return 0
    visited.add(stepId)

    const step = graph.steps.find((s) => s.id === stepId)
    if (!step || !step.dependencies || step.dependencies.length === 0) {
      depths[stepId] = 0
      return 0
    }

    const maxDepDep = Math.max(...step.dependencies.map((dep) => getDepth(dep)))
    depths[stepId] = maxDepDep + 1
    return depths[stepId]
  }

  graph.steps.forEach((s) => getDepth(s.id))
  return depths
}

// Get resource name from step, normalized
function getResourceName(step: PipelineStep): string {
  if (!step.resource) return '_aggregator_'
  // Extract base name: "app (ExecutableContainerResource)" -> "app"
  const match = step.resource.match(/^(\S+)/)
  return match ? match[1].toLowerCase() : '_aggregator_'
}

// Check if step is an aggregator (no resource = aggregator)
function isAggregator(step: PipelineStep): boolean {
  return !step.resource
}

export type LayoutResult = {
  positions: LayoutPositions
  resourceColumns: ResourceColumn[]
  centerLane: CenterLane | null
  canvasHeight: number
}

export function calculateHierarchicalPositions(
  graph: PipelineGraph,
  columnWidth = 280,
  rowHeight = 140,
  nodeSpacing = 200,
): LayoutResult {
  const positions: LayoutPositions = {}
  const depths = calculateDepthFromRoots(graph)

  // Separate aggregators from real resource steps
  const realSteps = graph.steps.filter((s) => !isAggregator(s))
  const aggregators = graph.steps.filter((s) => isAggregator(s))

  // If no aggregators, fall back to simple depth-based layout
  if (aggregators.length === 0) {
    return calculateSimpleLayout(graph, depths, rowHeight, nodeSpacing)
  }

  // Build reverse dependency map: which aggregator does each step feed into?
  const feedsIntoAggregator: Record<string, string[]> = {}
  aggregators.forEach((agg) => {
    ;(agg.dependencies || []).forEach((depId) => {
      const depStep = graph.steps.find((s) => s.id === depId)
      if (depStep && !isAggregator(depStep)) {
        if (!feedsIntoAggregator[depId]) feedsIntoAggregator[depId] = []
        feedsIntoAggregator[depId].push(agg.id)
      }
    })
  })

  // Calculate aggregator rows based on inter-aggregator dependencies
  const aggregatorRows: Record<string, number> = {}

  function calculateAggregatorRow(agg: PipelineStep, visited = new Set<string>()): number {
    if (aggregatorRows[agg.id] !== undefined) return aggregatorRows[agg.id]
    if (visited.has(agg.id)) return 0
    visited.add(agg.id)

    const deps = agg.dependencies || []
    const aggDeps = deps.filter((depId) => aggregators.some((a) => a.id === depId))

    if (aggDeps.length === 0) {
      // No aggregator dependencies - find max depth of its non-aggregator deps
      const nonAggDeps = deps.filter((depId) => !aggregators.some((a) => a.id === depId))
      const maxDepth = nonAggDeps.length > 0 ? Math.max(...nonAggDeps.map((id) => depths[id] || 0)) : 0
      aggregatorRows[agg.id] = maxDepth + 1
    } else {
      // Depends on other aggregators - place after them
      let maxAggRow = 0
      aggDeps.forEach((depId) => {
        const depAgg = aggregators.find((a) => a.id === depId)
        if (depAgg) {
          const depRow = calculateAggregatorRow(depAgg, new Set(visited))
          maxAggRow = Math.max(maxAggRow, depRow)
        }
      })
      // Also consider non-aggregator deps
      const nonAggDeps = deps.filter((depId) => !aggregators.some((a) => a.id === depId))
      const maxNonAggDepth = nonAggDeps.length > 0 ? Math.max(...nonAggDeps.map((id) => depths[id] || 0)) : 0
      aggregatorRows[agg.id] = Math.max(maxAggRow + 1, maxNonAggDepth + 1)
    }

    return aggregatorRows[agg.id]
  }

  aggregators.forEach((agg) => calculateAggregatorRow(agg))

  // Assign rows to resource steps - place in row BEFORE their target aggregator
  const stepRows: Record<string, number> = {}
  realSteps.forEach((step) => {
    const targetAggs = feedsIntoAggregator[step.id] || []
    if (targetAggs.length > 0) {
      const minAggRow = Math.min(...targetAggs.map((aggId) => aggregatorRows[aggId]))
      stepRows[step.id] = minAggRow - 1
    } else {
      stepRows[step.id] = depths[step.id]
    }
  })

  // Ensure dependency order: if step A depends on step B, A must be below B
  let changed = true
  let iterations = 0
  while (changed && iterations < 100) {
    changed = false
    iterations++
    realSteps.forEach((step) => {
      ;(step.dependencies || []).forEach((depId) => {
        const depStep = graph.steps.find((s) => s.id === depId)
        if (depStep && !isAggregator(depStep) && stepRows[depId] !== undefined) {
          if (stepRows[step.id] <= stepRows[depId]) {
            stepRows[step.id] = stepRows[depId] + 1
            changed = true
          }
        }
      })
    })
  }

  // Group steps by resource
  const resourceGroups: Record<string, PipelineStep[]> = {}
  realSteps.forEach((step) => {
    const resource = getResourceName(step)
    if (!resourceGroups[resource]) resourceGroups[resource] = []
    resourceGroups[resource].push(step)
  })

  const resourceNames = Object.keys(resourceGroups).sort((a, b) => a.localeCompare(b))

  // Calculate max nodes at any row per resource
  const resourceMaxAtRow: Record<string, number> = {}
  resourceNames.forEach((resource) => {
    const steps = resourceGroups[resource]
    const rowCounts: Record<number, number> = {}
    steps.forEach((step) => {
      const row = stepRows[step.id]
      rowCounts[row] = (rowCounts[row] || 0) + 1
    })
    resourceMaxAtRow[resource] = Math.max(...Object.values(rowCounts), 1)
  })

  // Calculate center lane width based on max parallel aggregators
  const aggsByRow: Record<number, PipelineStep[]> = {}
  aggregators.forEach((agg) => {
    const row = aggregatorRows[agg.id]
    if (!aggsByRow[row]) aggsByRow[row] = []
    aggsByRow[row].push(agg)
  })
  const maxParallelAggs = Math.max(...Object.values(aggsByRow).map((arr) => arr.length), 1)
  const aggSpacing = 120
  const centerLaneWidth = Math.max(200, (maxParallelAggs - 1) * aggSpacing + 140)

  // Split resources: half on left, half on right of center lane
  const leftResources = resourceNames.slice(0, Math.ceil(resourceNames.length / 2))
  const rightResources = resourceNames.slice(Math.ceil(resourceNames.length / 2))

  // Position columns
  let currentX = 150
  const resourceColumnStart: Record<string, number> = {}
  const resourceColumnInfo: ResourceColumn[] = []
  const columnGap = 60

  // Position left resources
  leftResources.forEach((resource) => {
    const maxNodesAtRow = resourceMaxAtRow[resource]
    const colWidth = (maxNodesAtRow - 1) * nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getResourceColor(sampleStep?.resource)

    resourceColumnInfo.push({
      name: resource,
      displayName: resource.toUpperCase(),
      centerX: currentX + colWidth / 2,
      startX: currentX - 20,
      width: colWidth + 40,
      color,
    })

    currentX += colWidth + columnGap
  })

  // Add center lane
  const centerLaneX = currentX + centerLaneWidth / 2
  const centerLane: CenterLane = {
    centerX: centerLaneX,
    width: centerLaneWidth,
    startX: currentX,
  }
  currentX += centerLaneWidth + columnGap

  // Position right resources
  rightResources.forEach((resource) => {
    const maxNodesAtRow = resourceMaxAtRow[resource]
    const colWidth = (maxNodesAtRow - 1) * nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getResourceColor(sampleStep?.resource)

    resourceColumnInfo.push({
      name: resource,
      displayName: resource.toUpperCase(),
      centerX: currentX + colWidth / 2,
      startX: currentX - 20,
      width: colWidth + 40,
      color,
    })

    currentX += colWidth + columnGap
  })

  // Position resource steps by row
  resourceNames.forEach((resource) => {
    const steps = resourceGroups[resource]
    const columnCenterX = resourceColumnStart[resource]

    const rowGroups: Record<number, PipelineStep[]> = {}
    steps.forEach((step) => {
      const row = stepRows[step.id]
      if (!rowGroups[row]) rowGroups[row] = []
      rowGroups[row].push(step)
    })

    Object.entries(rowGroups).forEach(([rowStr, stepsAtRow]) => {
      const row = Number(rowStr)
      const y = 100 + row * rowHeight
      const totalWidth = (stepsAtRow.length - 1) * nodeSpacing
      const startX = columnCenterX - totalWidth / 2

      stepsAtRow.forEach((step, idx) => {
        positions[step.id] = { x: startX + idx * nodeSpacing, y }
      })
    })
  })

  // Position aggregators in center lane
  Object.entries(aggsByRow).forEach(([rowStr, aggsAtRow]) => {
    const row = Number(rowStr)
    const y = 100 + row * rowHeight
    const totalWidth = (aggsAtRow.length - 1) * aggSpacing
    const startX = centerLaneX - totalWidth / 2

    aggsAtRow.forEach((agg, idx) => {
      positions[agg.id] = { x: startX + idx * aggSpacing, y }
    })
  })

  // Calculate max row for canvas height
  const allRows = [...Object.values(stepRows), ...Object.values(aggregatorRows)]
  const maxRow = Math.max(...allRows, 0)

  return {
    positions,
    resourceColumns: resourceColumnInfo,
    centerLane,
    canvasHeight: 100 + (maxRow + 1) * rowHeight + 100,
  }
}

// Simple layout fallback when no aggregators exist
function calculateSimpleLayout(
  graph: PipelineGraph,
  depths: Record<string, number>,
  rowHeight: number,
  nodeSpacing: number,
): LayoutResult {
  const positions: LayoutPositions = {}

  const resourceGroups: Record<string, PipelineStep[]> = {}
  graph.steps.forEach((step) => {
    const resource = getResourceName(step)
    if (!resourceGroups[resource]) resourceGroups[resource] = []
    resourceGroups[resource].push(step)
  })

  const resourceNames = Object.keys(resourceGroups).sort((a, b) => a.localeCompare(b))

  const resourceMaxAtDepth: Record<string, number> = {}
  resourceNames.forEach((resource) => {
    const steps = resourceGroups[resource]
    const depthCounts: Record<number, number> = {}
    steps.forEach((step) => {
      const d = depths[step.id]
      depthCounts[d] = (depthCounts[d] || 0) + 1
    })
    resourceMaxAtDepth[resource] = Math.max(...Object.values(depthCounts), 1)
  })

  let currentX = 150
  const resourceColumnStart: Record<string, number> = {}
  const resourceColumnInfo: ResourceColumn[] = []
  const columnGap = 80

  resourceNames.forEach((resource) => {
    const maxNodesAtDepth = resourceMaxAtDepth[resource]
    const colWidth = (maxNodesAtDepth - 1) * nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getResourceColor(sampleStep?.resource)

    resourceColumnInfo.push({
      name: resource,
      displayName: resource === '_aggregator_' ? 'Pipeline' : resource.toUpperCase(),
      centerX: currentX + colWidth / 2,
      startX: currentX - 20,
      width: colWidth + 40,
      color,
    })

    currentX += colWidth + columnGap
  })

  const maxDepth = Math.max(...Object.values(depths), 0)

  resourceNames.forEach((resource) => {
    const steps = resourceGroups[resource]
    const columnCenterX = resourceColumnStart[resource]

    const depthGroups: Record<number, PipelineStep[]> = {}
    steps.forEach((step) => {
      const d = depths[step.id]
      if (!depthGroups[d]) depthGroups[d] = []
      depthGroups[d].push(step)
    })

    Object.entries(depthGroups).forEach(([depthStr, stepsAtDepth]) => {
      const depth = Number(depthStr)
      const y = 100 + depth * rowHeight
      const totalWidth = (stepsAtDepth.length - 1) * nodeSpacing
      const startX = columnCenterX - totalWidth / 2

      stepsAtDepth.forEach((step, idx) => {
        positions[step.id] = { x: startX + idx * nodeSpacing, y }
      })
    })
  })

  return {
    positions,
    resourceColumns: resourceColumnInfo,
    centerLane: null,
    canvasHeight: 100 + (maxDepth + 1) * rowHeight + 100,
  }
}

// Compute hierarchical levels (kept for compatibility)
export function calculateLevels(graph: PipelineGraph): Record<string, number> {
  return calculateDepthFromRoots(graph)
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
