import { describe, it, expect } from 'vitest'
import { parseLogLine } from '@aspire-pipeline-viewer/core'

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

describe('LogParser OSC/ANSI edge cases', () => {
  const ref = Date.UTC(2025, 0, 1)
  it('parses lines with OSC and ANSI codes before timestamp/step', () => {
    const line = '\x1b]9;4;3\x1b\\23:52:13 (lint-frontend) → Starting lint-frontend...'
    const events = parseLogLine(line, ref)
    expect(events.length).toBe(1)
    const ev = events[0]
    expect(ev.type).toBe('start')
    expect(ev.stepName).toBe('lint-frontend')
    expect(ev.text).toContain('lint-frontend')
    expect(ev.timestamp).toBe(Date.UTC(2025, 0, 1, 23, 52, 13))
  })
})

describe('LogParser real-world OSC/ANSI lines', () => {
  const ref = Date.UTC(2025, 0, 1)
  it('parses real-world OSC/ANSI log lines and extracts step names', () => {
    const lines = [
      '\x1b]9;4;3\x1b\\23:56:40 (pipeline-execution) → Starting pipeline-execution...',
      '\x1b]9;4;3\x1b\\23:56:40 (install-uv-app) → Starting install-uv-app...',
      '\x1b]9;4;3\x1b\\23:56:40 (lint-frontend) → Starting lint-frontend...',
      '\x1b]9;4;3\x1b\\23:56:40 (lint-frontend) i [INF] Linting for frontend completed successfully.',
      '\x1b]9;4;3\x1b\\23:56:40 (lint-frontend) ✓ lint-frontend completed successfully',
      '\x1b]9;4;3\x1b\\23:56:40 (install-uv-app) ✗ [ERR] Resolved 70 packages in 0.81ms',
      '\x1b]9;4;3\x1b\\23:56:40 (install-uv-app) ✗ [ERR] Audited 69 packages in 2ms',
      '\x1b]9;4;3\x1b\\23:56:40 (install-uv-app) ✓ install-uv-app completed successfully',
      '\x1b]9;4;3\x1b\\23:56:40 (install-app) → Starting install-app...',
      '\x1b]9;4;3\x1b\\23:56:40 (install-app) i [INF] Installation for app completed successfully.',
      '\x1b]9;4;3\x1b\\23:56:40 (install-app) ✓ install-app completed successfully',
    ];
    for (const line of lines) {
      // Use String.raw to avoid octal escape issues
      const events = parseLogLine(String.raw`${line}`, ref);
      expect(events.length).toBe(1);
      const ev = events[0];
      expect(ev.stepName).toBeDefined();
      expect(typeof ev.stepName).toBe('string');
      expect(ev.stepName!.length).toBeGreaterThan(0);
    }
  });
});
