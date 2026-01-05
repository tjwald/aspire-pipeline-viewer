import { describe, it, expect } from 'vitest'
import { parseLogLine } from '@aspire-pipeline-viewer/core'

describe('LogParser', () => {
  const ref = Date.UTC(2025, 0, 1)

  it('parses start lines', () => {
    const line = '09:52:13 (install-uv-app) → Starting install-uv-app...'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('start')
    expect(ev!.stepName).toBe('install-uv-app')
    expect(ev!.text).toBe('Starting install-uv-app...')
    expect(ev!.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 13))
  })

  it('parses success lines', () => {
    const line = '09:52:14 (install-uv-app) ✓ install-uv-app completed successfully'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('success')
    expect(ev!.stepName).toBe('install-uv-app')
    expect(ev!.text).toBe('install-uv-app completed successfully')
    expect(ev!.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 14))
  })

  it('parses failure lines', () => {
    const line = '09:52:15 (install-uv-app) ✗ failed to run step'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('failure')
    expect(ev!.stepName).toBe('install-uv-app')
    expect(ev!.text).toBe('failed to run step')
    expect(ev!.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 15))
  })

  it('routes generic step lines to step buffer', () => {
    const line = '09:52:16 (pipeline-execution) i Some intermediate log message'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('line')
    expect(ev!.stepName).toBe('pipeline-execution')
    expect(ev!.text).toBe('Some intermediate log message')
    expect(ev!.timestamp).toBe(Date.UTC(2025, 0, 1, 9, 52, 16))
  })

  it('handles lines without step/time as plain lines', () => {
    const line = 'A non standard output line without time'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('line')
    expect(ev!.stepName).toBeUndefined()
    expect(typeof ev!.timestamp).toBe('number')
  })
})

describe('LogParser OSC/ANSI edge cases', () => {
  const ref = Date.UTC(2025, 0, 1)
  it('parses lines with OSC and ANSI codes before timestamp/step', () => {
    const line = '\x1b]9;4;3\x1b\\23:52:13 (lint-frontend) → Starting lint-frontend...'
    const ev = parseLogLine(line, ref)
    expect(ev).toBeDefined()
    expect(ev!.type).toBe('start')
    expect(ev!.stepName).toBe('lint-frontend')
    expect(ev!.text).toContain('lint-frontend')
    expect(ev!.timestamp).toBe(Date.UTC(2025, 0, 1, 23, 52, 13))
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
      const ev = parseLogLine(String.raw`${line}`, ref);
      expect(ev).toBeDefined();
      expect(ev!.stepName).toBeDefined();
      expect(typeof ev!.stepName).toBe('string');
      expect(ev!.stepName!.length).toBeGreaterThan(0);
    }
  });
});

describe('LogParser regression: aspire lint output', () => {
  const ref = Date.UTC(2025, 0, 1)
  const regressionLines = [
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
    '\x1b]9;4;3\x1b\\23:56:40 (lint-lock-check-app) → Starting lint-lock-check-app...',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-ruff-app) → Starting lint-ruff-app...',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-mypy-app) → Starting lint-mypy-app...',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-lock-check-app) ✗ [ERR] Resolved 70 packages in 1ms',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-lock-check-app) ✓ lint-lock-check-app completed successfully',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-ruff-app) i [INF] All checks passed!',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-ruff-app) ✓ lint-ruff-app completed successfully',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-mypy-app) i [INF] Success: no issues found in 6 source files',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-mypy-app) ✓ lint-mypy-app completed successfully',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-app) → Starting lint-app...',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-app) i [INF] Linting for app completed successfully.',
    '\x1b]9;4;3\x1b\\23:56:40 (lint-app) ✓ lint-app completed successfully',
    '\x1b]9;4;3\x1b\\23:56:40 (lint) → Starting lint...',
    '\x1b]9;4;3\x1b\\23:56:40 (lint) i [INF] Linting finished successfully.',
    '\x1b]9;4;3\x1b\\23:56:40 (lint) ✓ lint completed successfully',
    '\x1b]9;4;3\x1b\\23:56:40 (pipeline-execution) ✓ Completed successfully',
  ]
  const regressionExpected = [
    { stepName: 'pipeline-execution', type: 'start' },
    { stepName: 'install-uv-app', type: 'start' },
    { stepName: 'lint-frontend', type: 'start' },
    { stepName: 'lint-frontend', type: 'line' },
    { stepName: 'lint-frontend', type: 'success' },
    { stepName: 'install-uv-app', type: 'failure' },
    { stepName: 'install-uv-app', type: 'failure' },
    { stepName: 'install-uv-app', type: 'success' },
    { stepName: 'install-app', type: 'start' },
    { stepName: 'install-app', type: 'line' },
    { stepName: 'install-app', type: 'success' },
    { stepName: 'lint-lock-check-app', type: 'start' },
    { stepName: 'lint-ruff-app', type: 'start' },
    { stepName: 'lint-mypy-app', type: 'start' },
    { stepName: 'lint-lock-check-app', type: 'failure' },
    { stepName: 'lint-lock-check-app', type: 'success' },
    { stepName: 'lint-ruff-app', type: 'line' },
    { stepName: 'lint-ruff-app', type: 'success' },
    { stepName: 'lint-mypy-app', type: 'line' },
    { stepName: 'lint-mypy-app', type: 'success' },
    { stepName: 'lint-app', type: 'start' },
    { stepName: 'lint-app', type: 'line' },
    { stepName: 'lint-app', type: 'success' },
    { stepName: 'lint', type: 'start' },
    { stepName: 'lint', type: 'line' },
    { stepName: 'lint', type: 'success' },
    { stepName: 'pipeline-execution', type: 'success' },
  ]
  it('matches expected output objects for aspire lint lines', () => {
    regressionLines.forEach((line, i) => {
      const event = parseLogLine(line, ref)
      expect(event).toBeDefined()
      expect({ stepName: event!.stepName, type: event!.type }).toEqual(regressionExpected[i])
    })
  })
})

