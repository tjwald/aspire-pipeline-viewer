import type { PipelineGraph, PipelineStep } from '@aspire/core'

// ============================================================================
// Layout Configuration
// ============================================================================

export type LayoutConfig = {
  columnWidth: number
  rowHeight: number
  nodeSpacing: number
  columnGap: number
  aggregatorSpacing: number
  minCenterLaneWidth: number
  canvasPadding: number
  headerHeight: number
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  columnWidth: 280,
  rowHeight: 140,
  nodeSpacing: 200,
  columnGap: 60,
  aggregatorSpacing: 120,
  minCenterLaneWidth: 200,
  canvasPadding: 100,
  headerHeight: 100,
}

// ============================================================================
// Layout Types
// ============================================================================

export type Position = { x: number; y: number }
export type LayoutPositions = Record<string, Position>

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

export type LayoutResult = {
  positions: LayoutPositions
  resourceColumns: ResourceColumn[]
  centerLane: CenterLane | null
  canvasHeight: number
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isAggregator(step: PipelineStep): boolean {
  return !step.resource
}

export function getResourceName(step: PipelineStep): string {
  if (!step.resource) return '_aggregator_'
  const match = step.resource.match(/^(\S+)/)
  return match ? match[1].toLowerCase() : '_aggregator_'
}

// ============================================================================
// Depth Calculator
// ============================================================================

export function calculateDepthFromRoots(graph: PipelineGraph): Record<string, number> {
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

// ============================================================================
// Resource Grouping
// ============================================================================

export type StepGroups = {
  realSteps: PipelineStep[]
  aggregators: PipelineStep[]
  resourceGroups: Record<string, PipelineStep[]>
  resourceNames: string[]
}

export function groupStepsByResource(graph: PipelineGraph): StepGroups {
  const realSteps = graph.steps.filter((s) => !isAggregator(s))
  const aggregators = graph.steps.filter((s) => isAggregator(s))

  const resourceGroups: Record<string, PipelineStep[]> = {}
  realSteps.forEach((step) => {
    const resource = getResourceName(step)
    if (!resourceGroups[resource]) resourceGroups[resource] = []
    resourceGroups[resource].push(step)
  })

  const resourceNames = Object.keys(resourceGroups).sort((a, b) => a.localeCompare(b))

  return { realSteps, aggregators, resourceGroups, resourceNames }
}

// ============================================================================
// Row Assignment
// ============================================================================

export type RowAssignments = {
  stepRows: Record<string, number>
  aggregatorRows: Record<string, number>
}

export function assignRows(
  graph: PipelineGraph,
  groups: StepGroups,
  depths: Record<string, number>
): RowAssignments {
  const { realSteps, aggregators } = groups
  
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

  // Calculate aggregator rows
  const aggregatorRows: Record<string, number> = {}

  function calculateAggregatorRow(agg: PipelineStep, visited = new Set<string>()): number {
    if (aggregatorRows[agg.id] !== undefined) return aggregatorRows[agg.id]
    if (visited.has(agg.id)) return 0
    visited.add(agg.id)

    const deps = agg.dependencies || []
    const aggDeps = deps.filter((depId) => aggregators.some((a) => a.id === depId))

    if (aggDeps.length === 0) {
      const nonAggDeps = deps.filter((depId) => !aggregators.some((a) => a.id === depId))
      const maxDepth = nonAggDeps.length > 0 ? Math.max(...nonAggDeps.map((id) => depths[id] || 0)) : 0
      aggregatorRows[agg.id] = maxDepth + 1
    } else {
      let maxAggRow = 0
      aggDeps.forEach((depId) => {
        const depAgg = aggregators.find((a) => a.id === depId)
        if (depAgg) {
          const depRow = calculateAggregatorRow(depAgg, new Set(visited))
          maxAggRow = Math.max(maxAggRow, depRow)
        }
      })
      const nonAggDeps = deps.filter((depId) => !aggregators.some((a) => a.id === depId))
      const maxNonAggDepth = nonAggDeps.length > 0 ? Math.max(...nonAggDeps.map((id) => depths[id] || 0)) : 0
      aggregatorRows[agg.id] = Math.max(maxAggRow + 1, maxNonAggDepth + 1)
    }

    return aggregatorRows[agg.id]
  }

  aggregators.forEach((agg) => calculateAggregatorRow(agg))

  // Assign rows to resource steps
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

  return { stepRows, aggregatorRows }
}

// ============================================================================
// Column Positioning
// ============================================================================

export type ColumnLayout = {
  resourceColumnStart: Record<string, number>
  resourceColumnInfo: ResourceColumn[]
  centerLane: CenterLane | null
  centerLaneX: number
}

export function calculateColumnLayout(
  groups: StepGroups,
  rowAssignments: RowAssignments,
  config: LayoutConfig,
  getColor: (resource?: string) => string
): ColumnLayout {
  const { aggregators, resourceGroups, resourceNames } = groups
  const { stepRows, aggregatorRows } = rowAssignments

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
  const centerLaneWidth = Math.max(
    config.minCenterLaneWidth,
    (maxParallelAggs - 1) * config.aggregatorSpacing + 140
  )

  // Split resources: half on left, half on right of center lane
  const leftResources = resourceNames.slice(0, Math.ceil(resourceNames.length / 2))
  const rightResources = resourceNames.slice(Math.ceil(resourceNames.length / 2))

  let currentX = 150
  const resourceColumnStart: Record<string, number> = {}
  const resourceColumnInfo: ResourceColumn[] = []

  // Position left resources
  leftResources.forEach((resource) => {
    const maxNodesAtRow = resourceMaxAtRow[resource]
    const colWidth = (maxNodesAtRow - 1) * config.nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getColor(sampleStep?.resource)

    resourceColumnInfo.push({
      name: resource,
      displayName: resource.toUpperCase(),
      centerX: currentX + colWidth / 2,
      startX: currentX - 20,
      width: colWidth + 40,
      color,
    })

    currentX += colWidth + config.columnGap
  })

  // Add center lane
  const centerLaneX = currentX + centerLaneWidth / 2
  const centerLane: CenterLane = {
    centerX: centerLaneX,
    width: centerLaneWidth,
    startX: currentX,
  }
  currentX += centerLaneWidth + config.columnGap

  // Position right resources
  rightResources.forEach((resource) => {
    const maxNodesAtRow = resourceMaxAtRow[resource]
    const colWidth = (maxNodesAtRow - 1) * config.nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getColor(sampleStep?.resource)

    resourceColumnInfo.push({
      name: resource,
      displayName: resource.toUpperCase(),
      centerX: currentX + colWidth / 2,
      startX: currentX - 20,
      width: colWidth + 40,
      color,
    })

    currentX += colWidth + config.columnGap
  })

  return { resourceColumnStart, resourceColumnInfo, centerLane, centerLaneX }
}

// ============================================================================
// Node Positioning
// ============================================================================

export function calculateNodePositions(
  groups: StepGroups,
  rowAssignments: RowAssignments,
  columnLayout: ColumnLayout,
  config: LayoutConfig
): LayoutPositions {
  const { aggregators, resourceGroups, resourceNames } = groups
  const { stepRows, aggregatorRows } = rowAssignments
  const { resourceColumnStart, centerLaneX } = columnLayout

  const positions: LayoutPositions = {}

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
      const y = config.headerHeight + row * config.rowHeight
      const totalWidth = (stepsAtRow.length - 1) * config.nodeSpacing
      const startX = columnCenterX - totalWidth / 2

      stepsAtRow.forEach((step, idx) => {
        positions[step.id] = { x: startX + idx * config.nodeSpacing, y }
      })
    })
  })

  // Position aggregators in center lane
  const aggsByRow: Record<number, PipelineStep[]> = {}
  aggregators.forEach((agg) => {
    const row = aggregatorRows[agg.id]
    if (!aggsByRow[row]) aggsByRow[row] = []
    aggsByRow[row].push(agg)
  })

  Object.entries(aggsByRow).forEach(([rowStr, aggsAtRow]) => {
    const row = Number(rowStr)
    const y = config.headerHeight + row * config.rowHeight
    const totalWidth = (aggsAtRow.length - 1) * config.aggregatorSpacing
    const startX = centerLaneX - totalWidth / 2

    aggsAtRow.forEach((agg, idx) => {
      positions[agg.id] = { x: startX + idx * config.aggregatorSpacing, y }
    })
  })

  return positions
}

// ============================================================================
// Simple Layout (fallback when no aggregators)
// ============================================================================

export function calculateSimpleLayout(
  graph: PipelineGraph,
  depths: Record<string, number>,
  config: LayoutConfig,
  getColor: (resource?: string) => string
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
    const colWidth = (maxNodesAtDepth - 1) * config.nodeSpacing + 180
    resourceColumnStart[resource] = currentX + colWidth / 2

    const sampleStep = resourceGroups[resource][0]
    const color = getColor(sampleStep?.resource)

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
      const y = config.headerHeight + depth * config.rowHeight
      const totalWidth = (stepsAtDepth.length - 1) * config.nodeSpacing
      const startX = columnCenterX - totalWidth / 2

      stepsAtDepth.forEach((step, idx) => {
        positions[step.id] = { x: startX + idx * config.nodeSpacing, y }
      })
    })
  })

  return {
    positions,
    resourceColumns: resourceColumnInfo,
    centerLane: null,
    canvasHeight: config.headerHeight + (maxDepth + 1) * config.rowHeight + config.canvasPadding,
  }
}

// ============================================================================
// Main Layout Function
// ============================================================================

export function calculateHierarchicalPositions(
  graph: PipelineGraph,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
  getColor: (resource?: string) => string = getResourceColor
): LayoutResult {
  if (graph.steps.length === 0) {
    return {
      positions: {},
      resourceColumns: [],
      centerLane: null,
      canvasHeight: config.headerHeight + config.canvasPadding,
    }
  }

  const depths = calculateDepthFromRoots(graph)
  const groups = groupStepsByResource(graph)

  // If no aggregators, fall back to simple depth-based layout
  if (groups.aggregators.length === 0) {
    return calculateSimpleLayout(graph, depths, config, getColor)
  }

  const rowAssignments = assignRows(graph, groups, depths)
  const columnLayout = calculateColumnLayout(groups, rowAssignments, config, getColor)
  const positions = calculateNodePositions(groups, rowAssignments, columnLayout, config)

  // Calculate max row for canvas height
  const allRows = [
    ...Object.values(rowAssignments.stepRows),
    ...Object.values(rowAssignments.aggregatorRows),
  ]
  const maxRow = Math.max(...allRows, 0)

  return {
    positions,
    resourceColumns: columnLayout.resourceColumnInfo,
    centerLane: columnLayout.centerLane,
    canvasHeight: config.headerHeight + (maxRow + 1) * config.rowHeight + config.canvasPadding,
  }
}

// ============================================================================
// Color Utilities
// ============================================================================

const RESOURCE_COLOR_MAP: Record<string, string> = {
  app: '#d63031',
  frontend: '#0984e3',
  node: '#27ae60',
  prerequisites: '#e67e22',
}

const COLOR_PALETTE = ['#7f39fb', '#0891b2', '#6b7280', '#be123c']

export function getResourceColor(resource?: string | null): string {
  if (!resource) return '#607d8b'
  const base = resource.split(' ')[0].toLowerCase()
  if (RESOURCE_COLOR_MAP[base]) return RESOURCE_COLOR_MAP[base]
  
  let hash = 0
  for (let i = 0; i < base.length; i++) {
    hash = base.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
}

// ============================================================================
// Text Utilities
// ============================================================================

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

// ============================================================================
// Legacy Export (for compatibility)
// ============================================================================

export function calculateLevels(graph: PipelineGraph): Record<string, number> {
  return calculateDepthFromRoots(graph)
}
