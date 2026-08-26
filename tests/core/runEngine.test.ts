import { describe, expect, it } from 'vitest'
import { RunEngine } from '../../src/core/application/runEngine'
import type { RunStatusChange } from '../../src/core/application/runEngine'
import type { PipelineGraph } from '../../src/core/domain/types'

const graph: PipelineGraph = {
  id: 'g1',
  steps: [
    { id: 'build-app', name: 'build-app' },
    { id: 'lint-frontend', name: 'lint-frontend', dependencies: ['build-app'] },
  ],
  edges: [{ id: 'e1', source: 'build-app', target: 'lint-frontend' }],
}

describe('RunEngine', () => {
  it('derives per-step status from output belonging to that step only', () => {
    const engine = new RunEngine()
    const events: Array<{ runId: string; event: unknown }> = []
    engine.onOutput((payload) => events.push(payload))

    engine.startRun('run-1', graph, 'lint-frontend')
    expect(engine.getRunState('run-1')?.nodeStatuses).toEqual({
      'build-app': 'pending',
      'lint-frontend': 'pending',
    })

    engine.ingest('run-1', 'stdout', '20:27:46 (build-app) \u2192 Starting build-app...\n')
    expect(engine.getRunState('run-1')?.nodeStatuses).toEqual({
      'build-app': 'running',
      'lint-frontend': 'pending',
    })

    engine.ingest('run-1', 'stdout', '20:27:47 (build-app) \u2713 build-app completed successfully\n')
    expect(engine.getRunState('run-1')?.nodeStatuses['build-app']).toBe('success')
    expect(engine.getRunState('run-1')?.nodeStatuses['lint-frontend']).toBe('pending')

    engine.ingest('run-1', 'stdout', '20:27:48 (lint-frontend) \u2192 Starting lint-frontend...\n')
    engine.ingest('run-1', 'stdout', '20:27:49 (lint-frontend) \u2713 lint-frontend completed successfully\n')

    expect(engine.getRunState('run-1')?.nodeStatuses).toEqual({
      'build-app': 'success',
      'lint-frontend': 'success',
    })

    expect(events).toHaveLength(4)
    expect(events[0]).toMatchObject({ runId: 'run-1', event: { stepId: 'build-app', type: 'start' } })
    expect(events[3]).toMatchObject({ runId: 'run-1', event: { stepId: 'lint-frontend', type: 'success' } })
  })

  it('does not mark a step as failed when a different step fails', () => {
    const engine = new RunEngine()
    engine.startRun('run-2', graph, 'lint-frontend')

    engine.ingest('run-2', 'stdout', '20:27:46 (build-app) \u2192 Starting build-app...\n')
    engine.ingest('run-2', 'stdout', '20:27:47 (build-app) \u2717 build-app failed\n')

    const state = engine.getRunState('run-2')
    expect(state?.nodeStatuses['build-app']).toBe('failed')
    expect(state?.nodeStatuses['lint-frontend']).toBe('pending')
  })

  it('resolves step aliases robustly to ANSI codes and casing', () => {
    const engine = new RunEngine()
    engine.startRun('run-3', graph, 'lint-frontend')

    engine.ingest('run-3', 'stdout', '20:27:46 (\u001b[32mBUILD-APP\u001b[0m) \u2192 Starting build-app...\n')

    expect(engine.getRunState('run-3')?.nodeStatuses['build-app']).toBe('running')
  })

  it('isolates partial line buffers between concurrent runs', () => {
    const engine = new RunEngine()
    engine.startRun('run-a', graph, 'lint-frontend')
    engine.startRun('run-b', graph, 'lint-frontend')

    engine.ingest('run-a', 'stdout', '20:27:46 (build-app) \u2192 Starting')
    engine.ingest('run-b', 'stdout', '20:27:46 (lint-frontend) \u2192 Starting lint-frontend...\n')
    engine.ingest('run-a', 'stdout', ' build-app...\n')

    expect(engine.getRunState('run-a')?.logs[0]).toMatchObject({ stepId: 'build-app', type: 'start' })
    expect(engine.getRunState('run-b')?.logs[0]).toMatchObject({ stepId: 'lint-frontend', type: 'start' })
  })

  it('notifies status listeners with final node statuses on process exit', () => {
    const engine = new RunEngine()
    const statusChanges: unknown[] = []
    engine.onStatusChange((payload) => statusChanges.push(payload))

    engine.startRun('run-4', graph, 'lint-frontend')
    engine.ingest('run-4', 'stdout', '20:27:46 (lint-frontend) \u2713 lint-frontend completed successfully\n')
    engine.finishRun('run-4', 0)

    expect(statusChanges).toEqual([
      {
        runId: 'run-4',
        status: 'running',
        nodeStatuses: { 'build-app': 'pending', 'lint-frontend': 'success' },
      },
      {
        runId: 'run-4',
        status: 'success',
        nodeStatuses: { 'build-app': 'pending', 'lint-frontend': 'success' },
      },
    ])
  })

  it('notifies status listeners live as each individual step transitions', () => {
    const engine = new RunEngine()
    const statusChanges: RunStatusChange[] = []
    engine.onStatusChange((payload) => statusChanges.push(payload))

    engine.startRun('run-6', graph, 'lint-frontend')
    engine.ingest('run-6', 'stdout', '20:27:46 (build-app) \u2192 Starting build-app...\n')

    expect(statusChanges).toEqual([
      {
        runId: 'run-6',
        status: 'running',
        nodeStatuses: { 'build-app': 'running', 'lint-frontend': 'pending' },
      },
    ])
  })

  it('flushes a trailing partial line without a newline', () => {
    const engine = new RunEngine()
    engine.startRun('run-5', graph, 'lint-frontend')

    engine.ingest('run-5', 'stdout', '20:27:46 (lint-frontend) \u2713 lint-frontend completed successfully')
    expect(engine.getRunState('run-5')?.nodeStatuses['lint-frontend']).toBe('pending')

    engine.flush('run-5')
    expect(engine.getRunState('run-5')?.nodeStatuses['lint-frontend']).toBe('success')
  })

  it('derives step status from production-shaped Windows output', () => {
    const engine = new RunEngine()
    const productionGraph: PipelineGraph = {
      id: 'pipeline',
      steps: [{ id: 'install-uv-app', name: 'install-uv-app' }],
      edges: [],
    }
    engine.startRun('run-crlf', productionGraph, 'install-uv-app')

    engine.ingest(
      'run-crlf',
      'stdout',
      [
        '00:03:30 (install-uv-app) → Starting install-uv-app...',
        '00:03:30 (install-uv-app) ✗ [ERR] Resolved 70 packages in 1ms',
        '00:03:30 (install-uv-app) ✓ install-uv-app completed successfully',
        '',
      ].join('\r\n')
    )

    const state = engine.getRunState('run-crlf')
    expect(state?.logs).toEqual([
      expect.objectContaining({ stepId: 'install-uv-app', type: 'start' }),
      expect.objectContaining({ stepId: 'install-uv-app', type: 'line' }),
      expect.objectContaining({ stepId: 'install-uv-app', type: 'success' }),
    ])
    expect(state?.nodeStatuses['install-uv-app']).toBe('success')
  })
})
