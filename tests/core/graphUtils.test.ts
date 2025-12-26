import { describe, it, expect } from 'vitest'
import type { PipelineGraph } from '@aspire/core'
import { filterGraphForTarget } from '@aspire/core'

const SAMPLE_GRAPH: PipelineGraph = {
  id: 'sample',
  name: 'Sample Graph',
  steps: [
    { id: 'build', name: 'Build', dependencies: [] },
    { id: 'test', name: 'Test', dependencies: ['build'] },
    { id: 'deploy', name: 'Deploy', dependencies: ['test'] },
    { id: 'notify', name: 'Notify', dependencies: ['deploy'] },
    { id: 'lint', name: 'Lint', dependencies: [] },
  ],
  edges: [
    { id: 'build-test', source: 'build', target: 'test' },
    { id: 'test-deploy', source: 'test', target: 'deploy' },
    { id: 'deploy-notify', source: 'deploy', target: 'notify' },
    { id: 'lint-build', source: 'lint', target: 'build' },
  ],
}

describe('filterGraphForTarget', () => {
  it('keeps only the target and its dependency chain', () => {
    const filtered = filterGraphForTarget(SAMPLE_GRAPH, 'deploy')

    expect(filtered.steps.map((s) => s.id).sort()).toEqual(['build', 'deploy', 'test'])
  })

  it('filters edges to the included steps', () => {
    const filtered = filterGraphForTarget(SAMPLE_GRAPH, 'deploy')

    expect(filtered.edges).toEqual([
      { id: 'build-test', source: 'build', target: 'test' },
      { id: 'test-deploy', source: 'test', target: 'deploy' },
    ])
  })

  it('preserves dependencies only to included steps', () => {
    const filtered = filterGraphForTarget(SAMPLE_GRAPH, 'notify')
    const notifyStep = filtered.steps.find((s) => s.id === 'notify')

    expect(notifyStep?.dependencies).toEqual(['deploy'])
  })

  it('throws when the target step is missing', () => {
    expect(() => filterGraphForTarget(SAMPLE_GRAPH, 'missing')).toThrow('Step not found: missing')
  })

  it('returns a single-node graph when the target has no dependencies', () => {
    const filtered = filterGraphForTarget(SAMPLE_GRAPH, 'lint')

    expect(filtered.steps).toHaveLength(1)
    expect(filtered.steps[0].id).toBe('lint')
    expect(filtered.edges).toHaveLength(0)
  })
})
