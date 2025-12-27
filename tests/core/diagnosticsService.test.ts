import { describe, it, expect } from 'vitest'
import { DiagnosticsService } from '@aspire-pipeline-viewer/core'

const SAMPLE_DIAGNOSTICS = `
Step: install
  Description: Install dependencies
  Resource: node (ExecutableContainerResource)

Step: build
  Description: Build the application
  Dependencies: install
  Resource: app (ExecutableContainerResource)
  Tags: build

Step: test
  Description: Run tests
  Dependencies: build
  Tags: test
`

describe('DiagnosticsService', () => {
  it('analyzes diagnostics and returns formatted JSON', () => {
    const output = DiagnosticsService.analyze(SAMPLE_DIAGNOSTICS, 'json')
    expect(output).toBeTruthy()
    const parsed = JSON.parse(output)
    expect(parsed.steps).toBeDefined()
    expect(parsed.edges).toBeDefined()
  })

  it('analyzes diagnostics and returns formatted text', () => {
    const output = DiagnosticsService.analyze(SAMPLE_DIAGNOSTICS, 'text')
    expect(output).toContain('Pipeline:')
    expect(output).toContain('Steps:')
    expect(output).toContain('install')
    expect(output).toContain('build')
  })

  it('filters to specific step with dependencies', () => {
    const output = DiagnosticsService.analyze(SAMPLE_DIAGNOSTICS, 'json', 'build')
    const parsed = JSON.parse(output)
    expect(parsed.steps.length).toBe(2) // build + install dependency
    expect(parsed.steps.some((s: any) => s.id === 'build')).toBe(true)
    expect(parsed.steps.some((s: any) => s.id === 'install')).toBe(true)
  })

  it('throws error for non-existent step', () => {
    expect(() => {
      DiagnosticsService.analyze(SAMPLE_DIAGNOSTICS, 'json', 'nonexistent')
    }).toThrow('Step not found: nonexistent')
  })

  it('parses diagnostics to raw graph', () => {
    const graph = DiagnosticsService.parse(SAMPLE_DIAGNOSTICS)
    expect(graph.steps.length).toBeGreaterThan(0)
    expect(graph.edges).toBeDefined()
  })

  it('formats parsed graph with JSON', () => {
    const graph = DiagnosticsService.parse(SAMPLE_DIAGNOSTICS)
    const output = DiagnosticsService.format(graph, 'json')
    expect(output).toBeTruthy()
    const parsed = JSON.parse(output)
    expect(parsed.steps.length).toBeGreaterThan(0)
  })

  it('formats parsed graph with text output', () => {
    const graph = DiagnosticsService.parse(SAMPLE_DIAGNOSTICS)
    const output = DiagnosticsService.format(graph, 'text')
    expect(output).toContain('Pipeline:')
    expect(output).toContain('Steps:')
  })

  it('formats parsed graph with step filter', () => {
    const graph = DiagnosticsService.parse(SAMPLE_DIAGNOSTICS)
    const output = DiagnosticsService.format(graph, 'json', 'test')
    const parsed = JSON.parse(output)
    expect(parsed.steps.some((s: any) => s.id === 'test')).toBe(true)
    expect(parsed.steps.some((s: any) => s.id === 'build')).toBe(true)
    expect(parsed.steps.some((s: any) => s.id === 'install')).toBe(true)
  })
})
