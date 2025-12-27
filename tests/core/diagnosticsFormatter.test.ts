import { describe, it, expect } from 'vitest'
import { DiagnosticsFormatter } from '@aspire-pipeline-viewer/core'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

const SAMPLE_GRAPH: PipelineGraph = {
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
    },
    {
      id: 'test',
      name: 'Test',
      description: 'Run tests',
      dependencies: ['build'],
      resource: 'tester',
      tags: ['test'],
    },
    {
      id: 'deploy',
      name: 'Deploy',
      description: 'Deploy to production',
      dependencies: ['test'],
      resource: 'deployer',
      tags: ['deploy'],
    },
  ],
  edges: [
    { id: 'build-test', source: 'build', target: 'test' },
    { id: 'test-deploy', source: 'test', target: 'deploy' },
  ],
}

describe('DiagnosticsFormatter', () => {
  describe('format', () => {
    it('should format graph as JSON', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'json')
      expect(() => JSON.parse(output)).not.toThrow()

      const parsed = JSON.parse(output)
      expect(parsed.id).toBe('test-pipeline')
      expect(parsed.steps).toHaveLength(3)
      expect(parsed.edges).toHaveLength(2)
    })

    it('should format graph as text', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'text')

      expect(output).toContain('Pipeline: Test Pipeline')
      expect(output).toContain('ID: test-pipeline')
      expect(output).toContain('Steps: 3')
      expect(output).toContain('Edges: 2')
      expect(output).toContain('Build (build)')
      expect(output).toContain('Test (test)')
      expect(output).toContain('Deploy (deploy)')
    })

    it('should include step details in text format', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'text')

      expect(output).toContain('Description: Build the application')
      expect(output).toContain('Resource: builder')
      expect(output).toContain('Tags: build')
      expect(output).toContain('Dependencies: build')
    })

    it('should filter graph by step', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'json', 'deploy')
      const parsed = JSON.parse(output)

      expect(parsed.steps).toHaveLength(3) // deploy + test + build
      expect(parsed.steps.some((s: any) => s.id === 'deploy')).toBe(true)
      expect(parsed.steps.some((s: any) => s.id === 'test')).toBe(true)
      expect(parsed.steps.some((s: any) => s.id === 'build')).toBe(true)
    })

    it('should filter graph edges when filtering by step', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'json', 'test')
      const parsed = JSON.parse(output)

      expect(parsed.edges).toHaveLength(1) // only build-test edge
      expect(parsed.edges[0].id).toBe('build-test')
    })

    it('should throw error for nonexistent step filter', () => {
      expect(() => {
        DiagnosticsFormatter.format(SAMPLE_GRAPH, 'json', 'nonexistent')
      }).toThrow('Step not found: nonexistent')
    })

    it('should handle graph with no dependencies', () => {
      const simpleGraph: PipelineGraph = {
        id: 'simple',
        name: 'Simple',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            dependencies: [],
            tags: [],
          },
        ],
        edges: [],
      }

      const output = DiagnosticsFormatter.format(simpleGraph, 'text')
      expect(output).toContain('Step 1 (step1)')
      expect(output).not.toContain('Dependencies:')
    })

    it('should handle graph with no tags', () => {
      const noTagsGraph: PipelineGraph = {
        id: 'no-tags',
        name: 'No Tags',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            dependencies: [],
            tags: [],
          },
        ],
        edges: [],
      }

      const output = DiagnosticsFormatter.format(noTagsGraph, 'text')
      expect(output).toContain('Step 1 (step1)')
      expect(output).not.toContain('Tags:')
    })

    it('should handle graph with no resource', () => {
      const noResourceGraph: PipelineGraph = {
        id: 'no-resource',
        name: 'No Resource',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            dependencies: [],
            tags: [],
          },
        ],
        edges: [],
      }

      const output = DiagnosticsFormatter.format(noResourceGraph, 'text')
      expect(output).toContain('Step 1 (step1)')
      expect(output).not.toContain('Resource:')
    })

    it('should preserve order of steps', () => {
      const output = DiagnosticsFormatter.format(SAMPLE_GRAPH, 'json')
      const parsed = JSON.parse(output)

      expect(parsed.steps[0].id).toBe('build')
      expect(parsed.steps[1].id).toBe('test')
      expect(parsed.steps[2].id).toBe('deploy')
    })
  })
})
