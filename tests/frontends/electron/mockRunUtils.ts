import { EventEmitter } from 'events'
import { parseLogLine } from '@aspire-pipeline-viewer/core/services/logParser'
import type { IRunService } from '@aspire-pipeline-viewer/core/services/interfaces'

export interface MockRunServiceOptions {
  // kept for API parity; not used to avoid filesystem IO
  userDataDir?: string
}

export class MockRunService extends EventEmitter implements IRunService {
  private runs = new Map<string, { startedAt: number; name?: string; logs: string[] }>()

  constructor(_opts?: MockRunServiceOptions) {
    super()
  }

  async startRun(stepName: string): Promise<string> {
    const runId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()
    this.runs.set(runId, { startedAt, name: `Run ${stepName}`, logs: [] })
    return runId
  }

  async stopRun(_runId: string): Promise<void> {
    return
  }

  async renameRun(runId: string, name: string): Promise<void> {
    const rec = this.runs.get(runId)
    if (!rec) return
    rec.name = name
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>> {
    const out: Array<{ runId: string; name?: string; startedAt: number }> = []
    for (const [runId, rec] of this.runs.entries()) {
      out.push({ runId, name: rec.name, startedAt: rec.startedAt })
    }
    return out
  }

  // helpers to simulate process output (in-memory, no filesystem IO)
  async emitStdout(runId: string, text: string) {
    const rec = this.runs.get(runId)
    if (!rec) throw new Error('unknown run')
    rec.logs.push(text)
    const lines = text.split(/\r?\n/)
    for (const ln of lines) {
      if (!ln) continue
      const events = parseLogLine(ln)
      for (const ev of events) {
        this.emit('event', { runId, event: ev })
      }
    }
  }

  async emitStderr(runId: string, text: string) {
    return this.emitStdout(runId, text)
  }

  // expose logs for assertions in tests
  getLogs(runId: string): string[] | undefined {
    return this.runs.get(runId)?.logs
  }
}
