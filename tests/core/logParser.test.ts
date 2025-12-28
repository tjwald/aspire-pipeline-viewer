import { describe, it, expect } from 'vitest'
import { parseLogLine } from '@aspire-pipeline-viewer/core/services/logParser'

describe('LogParser', () => {
  const ref = Date.UTC(2025, 0, 1)

  it('parses start lines', () => {
    const line = '09:52:13 (install-uv-app) → Starting install-uv-app...'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('start')
    expect(ev.stepName).toBe('install-uv-app')
    expect(ev.text).toBe(line)
    expect(ev.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 13))
  })

  it('parses success lines', () => {
    const line = '09:52:14 (install-uv-app) ✓ install-uv-app completed successfully'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('success')
    expect(ev.stepName).toBe('install-uv-app')
    expect(ev.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 14))
  })

  it('parses failure lines', () => {
    const line = '09:52:15 (install-uv-app) ✗ failed to run step'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('failure')
    expect(ev.stepName).toBe('install-uv-app')
    expect(ev.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 15))
  })

  it('routes generic step lines to step buffer', () => {
    const line = '09:52:16 (pipeline-execution) i Some intermediate log message'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('line')
    expect(ev.stepName).toBe('pipeline-execution')
    expect(ev.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 16))
  })

  it('handles lines without step/time as plain lines', () => {
    const line = 'A non standard output line without time'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('line')
    expect(ev.stepName).toBeUndefined()
    expect(typeof ev.timestamp).toBe('number')
  })
})
