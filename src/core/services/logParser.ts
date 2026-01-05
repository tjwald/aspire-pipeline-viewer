import type { ParsedEvent } from './interfaces'

const stripAnsi = (input: string) =>
  input.replace(
    // ANSI escape sequences
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-9;]*[A-Za-z]|\u001B\][0-9];.*?(\u0007|\\)/g,
    ""
  );

/**
 * Parse a single log line from aspire output and return zero-or-more ParsedEvent entries.
 * The parser is pure and takes an optional referenceDateMs so tests can assert deterministic timestamps.
 * This version does not use regex and is robust to spinner lines and malformed input.
 */
export function parseLogLine(
  raw: string,
  referenceDateMs?: number
): ParsedEvent | null {
  if (!raw) return null;

  const clean = stripAnsi(raw).trim();
  if (!clean) return null;

  const timePart = clean.slice(0, 8);
  const isTime =
    timePart.length === 8 &&
    timePart[2] === ":" &&
    timePart[5] === ":" &&
    /^\d{2}:\d{2}:\d{2}$/.test(timePart);

  if (isTime) {
    const [hh, mm, ss] = timePart.split(":").map(Number);
    const refMs = referenceDateMs ?? Date.now();
    const ref = new Date(refMs);

    const timestamp = new Date(
      ref.getFullYear(),
      ref.getMonth(),
      ref.getDate(),
      hh,
      mm,
      ss
    ).getTime();

    const openParen = clean.indexOf("(");
    const closeParen = clean.indexOf(")", openParen + 1);

    if (openParen !== -1 && closeParen !== -1) {
      const stepName = clean.slice(openParen + 1, closeParen).trim();
      const after = clean.slice(closeParen + 1).trim();

      const symbol = after[0];
      const type =
        symbol === "→"
          ? "start"
          : symbol === "i"
          ? "line"
          : symbol === "✓"
          ? "success"
          : symbol === "✗"
          ? "failure"
          : null;

      if (type) {
        const text = after.slice(1).trim();
        return { timestamp, stepName, type, text };
      }
    }
  }

  // Fallback: unstructured line
  return {
    timestamp: referenceDateMs ?? Date.now(),
    type: "line",
    text: clean,
  };
}