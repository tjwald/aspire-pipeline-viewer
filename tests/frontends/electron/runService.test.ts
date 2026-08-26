import { EventEmitter } from 'events'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spawnMock = vi.fn()

vi.mock('child_process', () => ({
  spawn: spawnMock,
  default: { spawn: spawnMock },
}))

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  killed = false

  kill(): boolean {
    this.killed = true
    return true
  }
}

describe('RunService active run hydration', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspire-run-service-'))
    spawnMock.mockReset()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns parsed output received before the renderer subscribes', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const { RunService } = await import('../../../src/frontends/electron/services/runService')
    const service = new RunService(tempDir)
    const runId = await service.startRun('lint-frontend')

    child.stdout.emit(
      'data',
      Buffer.from('20:27:46 (lint-frontend) → Starting lint-frontend...\n')
    )
    child.stdout.emit(
      'data',
      Buffer.from('20:27:46 (lint-frontend) ✓ lint-frontend completed successfully\n')
    )

    const details = await service.getRunDetails(runId)

    expect(details?.logs).toEqual([
      expect.objectContaining({
        stepName: 'lint-frontend',
        type: 'start',
        text: 'Starting lint-frontend...',
      }),
      expect.objectContaining({
        stepName: 'lint-frontend',
        type: 'success',
        text: 'lint-frontend completed successfully',
      }),
    ])
  })

  it('emits resolved output and correct statuses from Windows Aspire output', async () => {
    const child = new FakeChildProcess()
    spawnMock.mockReturnValue(child)

    const { RunService } = await import('../../../src/frontends/electron/services/runService')
    const service = new RunService(tempDir)
    const outputListener = vi.fn()
    const statusListener = vi.fn()
    service.on('event', outputListener)
    service.on('run-status-change', statusListener)

    const runId = await service.startRun('install-uv-app', {
      id: 'pipeline',
      steps: [{ id: 'step-1', name: 'install-uv-app' }],
      edges: [],
    })

    child.stdout.emit(
      'data',
      Buffer.from([
        '20:27:46 (install-uv-app) → Starting install-uv-app...',
        '20:27:46 (install-uv-app) ✗ [ERR] Resolved 70 packages in 1ms',
        '20:27:46 (install-uv-app) ✓ install-uv-app completed successfully',
        '',
      ].join('\r\n'))
    )

    expect(outputListener.mock.calls.map(([payload]) => payload.event)).toEqual([
      expect.objectContaining({ stepId: 'step-1', stepName: 'install-uv-app', type: 'start' }),
      expect.objectContaining({ stepId: 'step-1', stepName: 'install-uv-app', type: 'line' }),
      expect.objectContaining({ stepId: 'step-1', stepName: 'install-uv-app', type: 'success' }),
    ])
    expect(statusListener.mock.calls.map(([payload]) => payload)).toEqual([
      { runId, status: 'running', nodeStatuses: { 'step-1': 'running' } },
      { runId, status: 'running', nodeStatuses: { 'step-1': 'success' } },
    ])
  })

  it('keeps partial output isolated between concurrent runs', async () => {
    const firstChild = new FakeChildProcess()
    const secondChild = new FakeChildProcess()
    spawnMock.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild)

    const { RunService } = await import('../../../src/frontends/electron/services/runService')
    const service = new RunService(tempDir)
    const firstRunId = await service.startRun('first-step')
    const secondRunId = await service.startRun('second-step')

    firstChild.stdout.emit('data', Buffer.from('20:27:46 (first-step) → Starting'))
    secondChild.stdout.emit('data', Buffer.from('20:27:46 (second-step) → Starting second-step...\n'))
    firstChild.stdout.emit('data', Buffer.from(' first-step...\n'))

    const [firstDetails, secondDetails] = await Promise.all([
      service.getRunDetails(firstRunId),
      service.getRunDetails(secondRunId),
    ])

    expect(firstDetails?.logs[0]).toMatchObject({ stepName: 'first-step', type: 'start' })
    expect(secondDetails?.logs[0]).toMatchObject({ stepName: 'second-step', type: 'start' })
  })
})
