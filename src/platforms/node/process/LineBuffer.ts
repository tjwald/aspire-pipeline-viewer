/**
 * LineBuffer buffers incoming string chunks and emits complete lines.
 */
export class LineBuffer {
  private buffer = ''

  /**
   * Append chunk and return all complete lines found.
   */
  append(chunk: string): string[] {
    this.buffer += chunk
    const lines: string[] = []

    let newlineIdx: number
    while ((newlineIdx = this.buffer.indexOf('\n')) >= 0) {
      let line = this.buffer.slice(0, newlineIdx)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }
      this.buffer = this.buffer.slice(newlineIdx + 1)
      lines.push(line)
    }

    return lines
  }

  /**
   * Flush any remaining partial buffer content as a line.
   */
  flush(): string | null {
    if (this.buffer.length === 0) return null
    let line = this.buffer
    if (line.endsWith('\r')) {
      line = line.slice(0, -1)
    }
    this.buffer = ''
    return line.length > 0 ? line : null
  }

  /**
   * Clear the buffer.
   */
  clear(): void {
    this.buffer = ''
  }
}
