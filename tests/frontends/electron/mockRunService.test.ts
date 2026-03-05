import { describe, it, expect } from 'vitest'
import { MockRunService } from './mockRunUtils'

describe('MockRunService integration (in-memory)', () => {
  it('forwards parsed events and stores logs in-memory', async () => {
    const svc = new MockRunService()
    const events: Array<any> = []
    svc.on('event', (p) => events.push(p))

    const runId = await svc.startRun('install-uv-app')

    const line1 = '09:52:13 (install-uv-app) → Starting install-uv-app...\n'
    const line2 = '09:52:14 (install-uv-app) ✓ install-uv-app completed successfully\n'

    await svc.emitStdout(runId, line1)
    await svc.emitStdout(runId, line2)

    // allow event loop
    await new Promise((r) => setTimeout(r, 10))

    expect(events.length).toBeGreaterThanOrEqual(2)

    const types = events.map((e) => e.event.type)
    expect(types[0]).toBe('start')
    expect(types[1]).toBe('success')

    const logs = svc.getLogs(runId) || []
    expect(logs.join('')).toContain('Starting install-uv-app')
    expect(logs.join('')).toContain('completed successfully')
  })
})
