import { describe, expect, it } from 'vitest'
import type { PipelineGraph } from '@aspire/core'
import {
  calculateDepthFromRoots,
  groupStepsByResource,
  assignRows,
  calculateColumnLayout,
  calculateNodePositions,
  calculateHierarchicalPositions,
  isAggregator,
  getResourceName,
  getResourceColor,
  wrapStepName,
  DEFAULT_LAYOUT_CONFIG,
} from '../../../src/frontends/shared/layout'

// Test fixtures
const createSimpleGraph = (): PipelineGraph => ({
  id: 'test-graph',
  name: 'Test Pipeline',
  steps: [
    { id: 'step-1', name: 'Step 1', resource: 'app (Container)', dependencies: [] },
    { id: 'step-2', name: 'Step 2', resource: 'app (Container)', dependencies: ['step-1'] },
    { id: 'step-3', name: 'Step 3', resource: 'db (Database)', dependencies: ['step-1'] },
  ],
  edges: [
    { source: 'step-1', target: 'step-2' },
    { source: 'step-1', target: 'step-3' },
  ],
})

const createGraphWithAggregators = (): PipelineGraph => ({
  id: 'test-graph-agg',
  name: 'Test Pipeline with Aggregators',
  steps: [
    { id: 'step-1', name: 'Step 1', resource: 'app (Container)', dependencies: [] },
    { id: 'step-2', name: 'Step 2', resource: 'db (Database)', dependencies: [] },
    { id: 'agg-1', name: 'Aggregator', resource: undefined, dependencies: ['step-1', 'step-2'] },
  ],
  edges: [
    { source: 'step-1', target: 'agg-1' },
    { source: 'step-2', target: 'agg-1' },
  ],
})

describe('Layout Engine', () => {
  describe('calculateDepthFromRoots', () => {
    it('assigns depth 0 to steps with no dependencies', () => {
      const graph = createSimpleGraph()
      const depths = calculateDepthFromRoots(graph)
      expect(depths['step-1']).toBe(0)
    })

    it('assigns incremental depth based on dependencies', () => {
      const graph = createSimpleGraph()
      const depths = calculateDepthFromRoots(graph)
      expect(depths['step-2']).toBe(1)
      expect(depths['step-3']).toBe(1)
    })

    it('handles deep dependency chains', () => {
      const graph: PipelineGraph = {
        id: 'chain',
        name: 'Chain',
        steps: [
          { id: 'a', name: 'A', dependencies: [] },
          { id: 'b', name: 'B', dependencies: ['a'] },
          { id: 'c', name: 'C', dependencies: ['b'] },
          { id: 'd', name: 'D', dependencies: ['c'] },
        ],
        edges: [],
      }
      const depths = calculateDepthFromRoots(graph)
      expect(depths['a']).toBe(0)
      expect(depths['b']).toBe(1)
      expect(depths['c']).toBe(2)
      expect(depths['d']).toBe(3)
    })
  })

  describe('groupStepsByResource', () => {
    it('groups steps by their resource', () => {
      const graph = createSimpleGraph()
      const groups = groupStepsByResource(graph)
      expect(groups.resourceGroups['app']).toHaveLength(2)
      expect(groups.resourceGroups['db']).toHaveLength(1)
    })

    it('groups aggregators under _aggregator_', () => {
      const graph = createGraphWithAggregators()
      const groups = groupStepsByResource(graph)
      expect(groups.aggregators).toHaveLength(1)
      expect(groups.aggregators[0].id).toBe('agg-1')
    })
  })

  describe('assignRows', () => {
    it('assigns rows based on depth', () => {
      const graph = createSimpleGraph()
      const depths = calculateDepthFromRoots(graph)
      const groups = groupStepsByResource(graph)
      const rows = assignRows(graph, groups, depths)
      expect(rows.stepRows['step-1']).toBe(0)
      expect(rows.stepRows['step-2']).toBe(1)
      expect(rows.stepRows['step-3']).toBe(1)
    })
  })

  describe('calculateColumnLayout', () => {
    it('creates column layout structure', () => {
      const graph = createSimpleGraph()
      const groups = groupStepsByResource(graph)
      const depths = calculateDepthFromRoots(graph)
      const rows = assignRows(graph, groups, depths)
      const layout = calculateColumnLayout(
        groups,
        rows,
        DEFAULT_LAYOUT_CONFIG,
        getResourceColor
      )
      
      // Should have column info array
      expect(layout.resourceColumnInfo).toBeDefined()
      expect(layout.resourceColumnInfo.length).toBeGreaterThanOrEqual(2)
      
      const appColumn = layout.resourceColumnInfo.find(c => c.name === 'app')
      expect(appColumn).toBeDefined()
      
      const dbColumn = layout.resourceColumnInfo.find(c => c.name === 'db')
      expect(dbColumn).toBeDefined()
    })
  })

  describe('calculateNodePositions', () => {
    it('assigns x,y positions to all steps', () => {
      const graph = createSimpleGraph()
      const groups = groupStepsByResource(graph)
      const depths = calculateDepthFromRoots(graph)
      const rows = assignRows(graph, groups, depths)
      const layout = calculateColumnLayout(
        groups,
        rows,
        DEFAULT_LAYOUT_CONFIG,
        getResourceColor
      )
      
      const positions = calculateNodePositions(
        groups,
        rows,
        layout,
        DEFAULT_LAYOUT_CONFIG
      )
      
      expect(positions['step-1']).toBeDefined()
      expect(positions['step-1'].x).toBeGreaterThan(0)
      expect(positions['step-1'].y).toBeGreaterThan(0)
      
      expect(positions['step-2']).toBeDefined()
      expect(positions['step-3']).toBeDefined()
    })
  })

  describe('calculateHierarchicalPositions', () => {
    it('returns complete layout result', () => {
      const graph = createSimpleGraph()
      const result = calculateHierarchicalPositions(graph)
      
      expect(result.positions).toBeDefined()
      expect(result.resourceColumns).toBeDefined()
      expect(result.canvasHeight).toBeGreaterThan(0)
      
      // All steps should have positions
      graph.steps.forEach(step => {
        expect(result.positions[step.id]).toBeDefined()
      })
    })

    it('creates center lane when aggregators exist', () => {
      const graph = createGraphWithAggregators()
      const result = calculateHierarchicalPositions(graph)
      
      expect(result.centerLane).not.toBeNull()
      expect(result.centerLane?.width).toBeGreaterThan(0)
    })

    it('handles empty graph', () => {
      const graph: PipelineGraph = {
        id: 'empty',
        name: 'Empty',
        steps: [],
        edges: [],
      }
      const result = calculateHierarchicalPositions(graph)
      
      expect(result.positions).toEqual({})
      expect(result.resourceColumns).toEqual([])
    })

    it('positions aggregators in center lane', () => {
      const graph = createGraphWithAggregators()
      const result = calculateHierarchicalPositions(graph)
      
      // Verify aggregator has position
      expect(result.positions['agg-1']).toBeDefined()
      expect(result.positions['agg-1'].x).toBeGreaterThan(0)
    })
  })

  describe('isAggregator', () => {
    it('returns true for steps without resource', () => {
      expect(isAggregator({ id: 'a', name: 'A' })).toBe(true)
      expect(isAggregator({ id: 'a', name: 'A', resource: undefined })).toBe(true)
    })

    it('returns false for steps with resource', () => {
      expect(isAggregator({ id: 'a', name: 'A', resource: 'app' })).toBe(false)
    })
  })

  describe('getResourceName', () => {
    it('extracts base name from resource string', () => {
      expect(getResourceName({ id: 'a', name: 'A', resource: 'app (Container)' })).toBe('app')
      expect(getResourceName({ id: 'a', name: 'A', resource: 'mydb (Database)' })).toBe('mydb')
    })

    it('returns _aggregator_ for steps without resource', () => {
      expect(getResourceName({ id: 'a', name: 'A' })).toBe('_aggregator_')
    })
  })

  describe('getResourceColor', () => {
    it('returns specific colors for known resources', () => {
      expect(getResourceColor('app (Container)')).toBe('#d63031')
      expect(getResourceColor('frontend (Service)')).toBe('#0984e3')
    })

    it('returns consistent color for unknown resources', () => {
      const color1 = getResourceColor('custom-service')
      const color2 = getResourceColor('custom-service')
      expect(color1).toBe(color2)
    })

    it('returns default color for undefined', () => {
      expect(getResourceColor(undefined)).toBe('#607d8b')
      expect(getResourceColor(null)).toBe('#607d8b')
    })
  })

  describe('wrapStepName', () => {
    it('returns single line for short names', () => {
      expect(wrapStepName('short')).toEqual(['short'])
    })

    it('wraps at hyphens when possible', () => {
      const result = wrapStepName('my-long-step-name', 10)
      expect(result.length).toBeGreaterThan(1)
      result.forEach(line => expect(line.length).toBeLessThanOrEqual(10))
    })

    it('hard wraps when no hyphens', () => {
      const result = wrapStepName('verylongname', 5)
      expect(result.length).toBeGreaterThan(1)
    })
  })
})
