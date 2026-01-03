import type { ParsedEvent } from './interfaces'

/**
 * Parse a single log line from aspire output and return zero-or-more ParsedEvent entries.
 * The parser is pure and takes an optional referenceDateMs so tests can assert deterministic timestamps.
 * This version does not use regex and is robust to spinner lines and malformed input.
 */
export function parseLogLine(line: string, referenceDateMs?: number): ParsedEvent[] {
  const raw = (line ?? '').replace(/\r$/, '').trim()
  if (!raw) return []

  // Ignore spinner-only lines (those with only spinner unicode or ANSI codes)
  const spinnerChars = ['⠋','⠙','⠚','⠞','⠖','⠦','⠴','⠲','⠳','⠓']
  const ansiRegex = /\u001b\[[0-9;]*m|\u001b\].*?\\|\u001b\[\?25[lh]/g
  const cleaned = raw.replace(ansiRegex, '').trim()
  if (!cleaned || spinnerChars.some(c => cleaned.startsWith(c))) return []

  // Helper to parse time from the start of a line
  function parseTime(str: string): { timestamp: number | null, rest: string } {
    // Find time in format HH:MM:SS at start
    const timeMatch = str.match(/^(\d{2}):(\d{2}):(\d{2})\s+/)
    if (!timeMatch) return { timestamp: null, rest: str }
    const [_, hh, mm, ss] = timeMatch
    const ref = new Date(referenceDateMs ?? Date.now())
    const year = ref.getUTCFullYear()
    const month = ref.getUTCMonth()
    const day = ref.getUTCDate()
    const timestamp = Date.UTC(year, month, day, Number(hh), Number(mm), Number(ss))
    return { timestamp, rest: str.slice(timeMatch[0].length) }
  }

  // Helper to extract step name and event type
  function parseStepAndType(str: string): { stepName?: string, type: ParsedEvent['type'] } {
    // Find (step-name) marker, but allow for lines that end right after the step
    const stepStart = str.indexOf('(')
    const stepEnd = str.indexOf(')', stepStart)
    if (stepStart !== -1 && stepEnd !== -1) {
      const stepName = str.slice(stepStart + 1, stepEnd)
      const afterStep = str.slice(stepEnd + 1).trim()
      // If nothing after the step, still emit stepName
      if (!afterStep) return { stepName, type: 'line' }
      // Accept lines like '(step) i [INF] ...' as generic step lines
      if (afterStep.startsWith('→ Starting')) return { stepName, type: 'start' }
      if (afterStep.includes('✓')) return { stepName, type: 'success' }
      if (afterStep.includes('✗')) return { stepName, type: 'failure' }
      // If it starts with 'i [INF]' or similar, treat as 'line' with stepName
      if (/^(i\s*\[INF\]|i\s*\[ERR\]|i\s*\[WRN\])/.test(afterStep)) return { stepName, type: 'line' }
      return { stepName, type: 'line' }
    }
    return { type: 'line' }
  }

  // Main parse logic
  let timestamp: number | null = null
  let rest = cleaned
  // Try to parse time
  const timeResult = parseTime(rest)
  timestamp = timeResult.timestamp
  rest = timeResult.rest

  // Try to parse step and type
  const { stepName, type } = parseStepAndType(rest)

  // If no timestamp, fallback to Date.now()
  const ts = timestamp ?? Date.now()

  // Only emit events for lines with content
  return [{ timestamp: ts, stepName, type, text: raw }]
}
