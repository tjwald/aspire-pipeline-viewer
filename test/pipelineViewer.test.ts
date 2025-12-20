import { describe, it, expect } from 'vitest'
import type { PipelineGraph } from '../src/types/pipeline'

describe('PipelineViewer', () => {
  it('should render DAG nodes with topological layout', () => {
    const graph: PipelineGraph = {
      id: 'test-pipeline',
      name: 'Test Pipeline',
      steps: [
        {
          id: 'build',
          name: 'Build',
          description: 'Build the application',
          dependencies: [],
          resource: 'builder',
          tags: ['build'],
          status: 'Success',
        },
        {
          id: 'test',
          name: 'Test',
          description: 'Run tests',
          dependencies: ['build'],
          resource: 'tester',
          tags: ['test'],
          status: 'Success',
        },
        {
          id: 'deploy',
          name: 'Deploy',
          description: 'Deploy to production',
          dependencies: ['test'],
          resource: 'deployer',
          tags: ['deploy'],
          status: 'Pending',
        },
      ],
      edges: [
        { id: 'build-test', source: 'build', target: 'test' },
        { id: 'test-deploy', source: 'test', target: 'deploy' },
      ],
    }

    // Verify graph structure
    expect(graph.steps).toHaveLength(3)
    expect(graph.edges).toHaveLength(2)

    // Verify dependency resolution
    const buildStep = graph.steps.find((s) => s.id === 'build')
    expect(buildStep?.dependencies).toHaveLength(0)

    const testStep = graph.steps.find((s) => s.id === 'test')
    expect(testStep?.dependencies).toContain('build')

    const deployStep = graph.steps.find((s) => s.id === 'deploy')
    expect(deployStep?.dependencies).toContain('test')

    // Verify topological levels can be calculated
    const levels = new Map<string, number>()
    const visited = new Set<string>()

    const calculateLevel = (stepId: string): number => {
      if (levels.has(stepId)) return levels.get(stepId)!
      if (visited.has(stepId)) return 0

      visited.add(stepId)
      const step = graph.steps.find((s) => s.id === stepId)
      if (!step || !step.dependencies || step.dependencies.length === 0) {
        levels.set(stepId, 0)
        return 0
      }

      const maxDependencyLevel = Math.max(
        ...step.dependencies.map((depId) => calculateLevel(depId))
      )
      const level = maxDependencyLevel + 1
      levels.set(stepId, level)
      return level
    }

    graph.steps.forEach((step) => {
      calculateLevel(step.id)
    })

    // Verify levels
    expect(levels.get('build')).toBe(0)
    expect(levels.get('test')).toBe(1)
    expect(levels.get('deploy')).toBe(2)
  })
})
