import type { ParsedEvent } from './interfaces'

export type { ParsedEvent }

/**
 * Parse a single log line from aspire output and return zero-or-more ParsedEvent entries.
 * The parser is pure and takes an optional referenceDateMs so tests can assert deterministic timestamps.
 */
export function parseLogLine(line: string, referenceDateMs?: number): ParsedEvent[] {
  const raw = (line ?? '').replace(/\r$/, '')
  if (!raw.trim()) return []

  // Regexes (as per docs/STEP_RUN_DESIGN.md)
  const startRegex = /^(\d{2}):(\d{2}):(\d{2})\s+\(([^)]+)\)\s+→\s+Starting/i
  const successRegex = /^(\d{2}):(\d{2}):(\d{2})\s+\(([^)]+)\)\s+✓\s+.*completed successfully/i
  const failureRegex = /^(\d{2}):(\d{2}):(\d{2})\s+\(([^)]+)\)\s+✗\s+.*/i
  const routingRegex = /^(\d{2}):(\d{2}):(\d{2})\s+\(([^)]+)\)\s+(.*)$/
  const genericTimeRegex = /^(\d{2}):(\d{2}):(\d{2})\s+(.*)$/

  const computeTimestamp = (hh: number, mm: number, ss: number) => {
    const ref = new Date(referenceDateMs ?? Date.now())
    const year = ref.getUTCFullYear()
    const month = ref.getUTCMonth()
    const day = ref.getUTCDate()
    return Date.UTC(year, month, day, hh, mm, ss)
  }

  let m: RegExpMatchArray | null
  m = raw.match(startRegex)
  if (m) {
    const [, hh, mm, ss, step] = m
    const ts = computeTimestamp(Number(hh), Number(mm), Number(ss))
    return [{ timestamp: ts, stepName: step, type: 'start', text: raw }]
  }

  m = raw.match(successRegex)
  if (m) {
    const [, hh, mm, ss, step] = m
    const ts = computeTimestamp(Number(hh), Number(mm), Number(ss))
    return [{ timestamp: ts, stepName: step, type: 'success', text: raw }]
  }

  m = raw.match(failureRegex)
  if (m) {
    const [, hh, mm, ss, step] = m
    const ts = computeTimestamp(Number(hh), Number(mm), Number(ss))
    return [{ timestamp: ts, stepName: step, type: 'failure', text: raw }]
  }

  m = raw.match(routingRegex)
  if (m) {
    const [, hh, mm, ss, step] = m
    const ts = computeTimestamp(Number(hh), Number(mm), Number(ss))
    return [{ timestamp: ts, stepName: step, type: 'line', text: raw }]
  }

  m = raw.match(genericTimeRegex)
  if (m) {
    const [, hh, mm, ss] = m
    const ts = computeTimestamp(Number(hh), Number(mm), Number(ss))
    return [{ timestamp: ts, type: 'line', text: raw }]
  }

  return [{ timestamp: Date.now(), type: 'line', text: raw }]
}
