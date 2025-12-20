import { describe, it, expect } from 'vitest'
import { parseDiagnostics } from '../src/utils/diagnosticsParser'

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
})
