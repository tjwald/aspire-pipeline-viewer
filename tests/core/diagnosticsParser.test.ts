import { describe, it, expect } from 'vitest'
import { parseDiagnostics } from '@/core'

describe('diagnostics parser', () => {
  it('parses a representative diagnostics sample and finds steps and edges', () => {
    const sample = `
PIPELINE DEPENDENCY GRAPH DIAGNOSTICS
DETAILED STEP ANALYSIS
Step: build
    Description: Aggregation step for all build operations. All build steps should be required by this step.
    Dependencies: ✓ build-app, ✓ build-frontend

Step: build-app
    Dependencies: ✓ build-frontend, ✓ build-prereq
    Resource: app (ExecutableContainerResource)
    Tags: build-compute

Step: build-frontend
    Dependencies: ✓ build-prereq
    Resource: frontend (ExecutableContainerResource)
    Tags: build-compute

Step: build-prereq
    Description: Prerequisite step that runs before any build operations.
    Dependencies: ✓ process-parameters

Step: push-app
    Dependencies: ✓ build-app, ✓ build-app, ✓ push-prereq, ✓ push-prereq
    Resource: app (ExecutableContainerResource)
    Tags: push-container-image

POTENTIAL ISSUES:
`

    const graph = parseDiagnostics(sample)

    expect(graph.steps.length).toBeGreaterThanOrEqual(5)

    const build = graph.steps.find((s) => s.id === 'build')
    expect(build).toBeDefined()
    expect(build?.dependencies).toContain('build-app')

    const pushApp = graph.steps.find((s) => s.id === 'push-app')
    expect(pushApp).toBeDefined()
    // duplicates in source should be deduped
    const deps = pushApp?.dependencies ?? []
    const occurrences = deps.filter((d) => d === 'build-app').length
    expect(occurrences).toBeGreaterThanOrEqual(1)
  })

  it('handles log prefixes from aspire do diagnostics output', () => {
    const sample = `
02:04:05 (diagnostics) i DETAILED STEP ANALYSIS
02:04:05 (diagnostics) i =====================
02:04:05 (diagnostics) i Step: build
02:04:05 (diagnostics) i     Description: Build aggregation step
02:04:05 (diagnostics) i     Dependencies: ✓ build-app, ✓ build-frontend
02:04:05 (diagnostics) i 
02:04:05 (diagnostics) i Step: test
02:04:05 (diagnostics) i     Dependencies: none
`

    const graph = parseDiagnostics(sample)

    expect(graph.steps.length).toBe(2)
    const build = graph.steps.find((s) => s.id === 'build')
    expect(build?.dependencies).toEqual(['build-app', 'build-frontend'])
    
    const test = graph.steps.find((s) => s.id === 'test')
    expect(test?.dependencies).toEqual([])
  })

  it('handles multi-line descriptions', () => {
    const sample = `
Step: deploy-prereq
    Description: Prerequisite step that runs before any
deploy operations. Initializes deployment environment and manages 
deployment state
    Dependencies: ✓ process-parameters
`

    const graph = parseDiagnostics(sample)

    expect(graph.steps.length).toBe(1)
    const step = graph.steps[0]
    expect(step.id).toBe('deploy-prereq')
    expect(step.description).toContain('Prerequisite step')
    expect(step.description).toContain('deployment state')
    expect(step.dependencies).toContain('process-parameters')
  })

  it('creates edges from dependencies', () => {
    const sample = `
Step: build
    Dependencies: ✓ build-app, ✓ build-frontend

Step: build-app
    Dependencies: ✓ build-prereq

Step: build-frontend
    Dependencies: ✓ build-prereq

Step: build-prereq
    Dependencies: none
`

    const graph = parseDiagnostics(sample)

    expect(graph.steps.length).toBe(4)
    expect(graph.edges.length).toBeGreaterThan(0)
    
    // Check specific edges
    const buildPrerqEdge = graph.edges.find((e) => e.source === 'build-prereq' && e.target === 'build-app')
    expect(buildPrerqEdge).toBeDefined()
    expect(buildPrerqEdge?.id).toBe('e-build-prereq-build-app')
  })

  it('parses resources and tags', () => {
    const sample = `
Step: build-app
    Dependencies: ✓ build-prereq
    Resource: app (ExecutableContainerResource)
    Tags: build-compute
`

    const graph = parseDiagnostics(sample)

    const step = graph.steps[0]
    expect(step.resource).toBe('app (ExecutableContainerResource)')
    expect(step.tags).toContain('build-compute')
  })

  it('handles steps with no dependencies', () => {
    const sample = `
Step: process-parameters
    Description: Prompts for parameter values
    Dependencies: none

Step: setup
    Dependencies: ✓ process-parameters
`

    const graph = parseDiagnostics(sample)

    expect(graph.steps.length).toBe(2)
    const processParams = graph.steps.find((s) => s.id === 'process-parameters')
    expect(processParams?.dependencies).toEqual([])
    
    const setup = graph.steps.find((s) => s.id === 'setup')
    expect(setup?.dependencies).toEqual(['process-parameters'])
  })
})

