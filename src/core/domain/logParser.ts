import type { ParsedEvent } from './types'

const stripAnsi = (input: string) =>
  input.replace(
    // ANSI escape sequences used by older Aspire output.
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-9;]*[A-Za-z]|\u001B\][0-9];.*?(\u0007|\\)/g,
    ''
  )

/**
 * Parse a single non-interactive Aspire log line.
 * The parser is pure and takes an optional referenceDateMs so tests can assert deterministic timestamps.
 * Unstructured lines are retained as-is for display.
 */
export function parseLogLine(
  raw: string,
  referenceDateMs?: number
): ParsedEvent | null {
  if (!raw) return null

  const clean = stripAnsi(raw).replace(/\r$/, '')
  if (!clean.trim()) return null

  const structured = clean.match(
    /^(\d{2}):(\d{2}):(\d{2})\s+\(([^)]+)\)\s+(→|✓|✗|i)\s?(.*)$/
  )

  if (structured) {
    const [, hours, minutes, seconds, stepName, symbol, text] = structured
    const message = text.trim()
    const ref = new Date(referenceDateMs ?? Date.now())
    const timestamp = Date.UTC(
      ref.getUTCFullYear(),
      ref.getUTCMonth(),
      ref.getUTCDate(),
      Number(hours),
      Number(minutes),
      Number(seconds)
    )
    const type = symbol === '→'
      ? 'start'
      : symbol === '✓'
        ? 'success'
        : symbol === '✗' && !message.startsWith('[ERR]')
          ? 'failure'
          : 'line'

    return {
      timestamp,
      stepName,
      type,
      text: message,
      source: raw,
    }
  }

  return {
    timestamp: referenceDateMs ?? Date.now(),
    type: 'line',
    text: raw,
    source: raw,
  }
}
