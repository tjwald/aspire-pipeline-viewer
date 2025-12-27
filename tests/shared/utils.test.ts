import { describe, it, expect } from 'vitest'
import {
  calculateHierarchicalPositions,
  type LayoutResult,
  wrapStepName,
  getResourceColor,
} from '@aspire-pipeline-viewer/shared/utils';
import { ExecutionStatus, type PipelineGraph } from '@aspire-pipeline-viewer/core'

describe('calculateHierarchicalPositions', () => {
  it('should calculate layout for simple linear pipeline', () => {
    const graph: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          description: 'First',
          dependencies: [],
          resource: 'resource1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'step2',
          name: 'Step 2',
          description: 'Second',
          dependencies: ['step1'],
          resource: 'resource1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [{ id: 'edge1', source: 'step1', target: 'step2' }],
    }

    const result: LayoutResult = calculateHierarchicalPositions(graph)

    expect(result.positions).toBeDefined()
    expect(result.positions.step1).toBeDefined()
    expect(result.positions.step2).toBeDefined()
    expect(result.positions.step2.y).toBeGreaterThan(result.positions.step1.y)
    expect(result.canvasHeight).toBeGreaterThan(0)
  })

  it('should handle parallel steps at same depth', () => {
    const graph: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          description: '',
          dependencies: [],
          resource: 'resource1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'step2',
          name: 'Step 2',
          description: '',
          dependencies: [],
          resource: 'resource2 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [],
    }

    const result = calculateHierarchicalPositions(graph)

    expect(result.positions.step1.y).toBe(result.positions.step2.y)
    expect(result.positions.step1.x).not.toBe(result.positions.step2.x)
  })

  it('should create resource columns for different resources', () => {
    const graph: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          description: '',
          dependencies: [],
          resource: 'resource1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'step2',
          name: 'Step 2',
          description: '',
          dependencies: [],
          resource: 'resource2 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [],
    }

    const result = calculateHierarchicalPositions(graph)

    expect(result.resourceColumns.length).toBeGreaterThan(0)
    expect(result.resourceColumns.every((col) => col.width > 0)).toBe(true)
    expect(result.resourceColumns.every((col) => col.centerX >= 0)).toBe(true)
  })

  it('should handle aggregator steps without resources', () => {
    const graph: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          description: '',
          dependencies: [],
          resource: 'resource1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'aggregator',
          name: 'Aggregator',
          description: '',
          dependencies: ['step1'],
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [{ id: 'edge1', source: 'step1', target: 'aggregator' }],
    }

    const result = calculateHierarchicalPositions(graph)

    expect(result.positions.aggregator).toBeDefined()
    expect(result.centerLane).toBeDefined()
    expect(result.centerLane?.width).toBeGreaterThan(0)
  })

  it('should handle complex graph with multiple resources and aggregators', () => {
    const graph: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'build1',
          name: 'Build 1',
          description: '',
          dependencies: [],
          resource: 'builder1 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'build2',
          name: 'Build 2',
          description: '',
          dependencies: [],
          resource: 'builder2 (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'aggregate',
          name: 'Aggregate',
          description: '',
          dependencies: ['build1', 'build2'],
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'deploy',
          name: 'Deploy',
          description: '',
          dependencies: ['aggregate'],
          resource: 'deployer (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [
        { id: 'e1', source: 'build1', target: 'aggregate' },
        { id: 'e2', source: 'build2', target: 'aggregate' },
        { id: 'e3', source: 'aggregate', target: 'deploy' },
      ],
    }

    const result = calculateHierarchicalPositions(graph)

    expect(result.positions.aggregate.y).toBeGreaterThan(result.positions.build1.y)
    expect(result.positions.aggregate.y).toBeGreaterThan(result.positions.build2.y)
    expect(result.positions.deploy.y).toBeGreaterThan(result.positions.aggregate.y)
  })

  it('should handle empty graph', () => {
    const graph: PipelineGraph = {
      id: 'empty',
      name: 'Empty',
      steps: [],
      edges: [],
    }

    const result = calculateHierarchicalPositions(graph)

    expect(result.positions).toEqual({})
    expect(result.resourceColumns).toEqual([])
    expect(result.centerLane).toBeNull()
  })
})

describe('wrapStepName', () => {
  it('should not wrap short names', () => {
    expect(wrapStepName('Build')).toEqual(['Build'])
    expect(wrapStepName('Test')).toEqual(['Test'])
  })

  it('should wrap long names at max characters', () => {
    const longName = 'ThisIsAVeryLongStepNameThatNeedsWrapping'
    const wrapped = wrapStepName(longName, 20)
    expect(wrapped.length).toBeGreaterThan(1)
    expect(wrapped.every((line) => line.length <= 20)).toBe(true)
  })

  it('should handle names with hyphens', () => {
    const name = 'deploy-to-production'
    const wrapped = wrapStepName(name, 12)
    expect(wrapped.length).toBeGreaterThan(1)
    expect(wrapped.every((line) => line.length <= 12)).toBe(true)
  })

  it('should handle empty string', () => {
    expect(wrapStepName('')).toEqual([''])
  })

  it('should respect custom max width', () => {
    const name = 'LongStepName'
    const wrapped = wrapStepName(name, 5)
    expect(wrapped.length).toBeGreaterThan(1)
    expect(wrapped.every((line) => line.length <= 5)).toBe(true)
  })
})

describe('getResourceColor', () => {
  it('should return consistent colors for same resource', () => {
    const color1 = getResourceColor('resource1')
    const color2 = getResourceColor('resource1')
    expect(color1).toBe(color2)
  })

  it('should return different colors for different resources', () => {
    const color1 = getResourceColor('resource1')
    const color2 = getResourceColor('resource2')
    expect(color1).not.toBe(color2)
  })

  it('should return valid CSS color values', () => {
    const color = getResourceColor('test')
    expect(color).toMatch(/^#[0-9a-f]{6}$|^hsl\(|^rgb\(/)
  })

  it('should handle special characters in resource names', () => {
    const color = getResourceColor('resource-1_test.com')
    expect(color).toBeTruthy()
    expect(typeof color).toBe('string')
  })

  it('should handle empty string', () => {
    const color = getResourceColor('')
    expect(color).toBeTruthy()
  })
})
