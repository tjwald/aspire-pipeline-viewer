import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { parseLogLine, ParsedEvent, type IRunService } from '@aspire-pipeline-viewer/core';

function getUserDataPath(): string {
  try {
    // prefer Electron if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron')
    return electron.app?.getPath?.('userData') || process.cwd()
  } catch {
    return process.cwd()
  }
}

interface RunMeta {
  runId: string
  name?: string
  startedAt: number
  logPath: string
}

export class RunService extends EventEmitter implements IRunService {
  private runs = new Map<string, { proc?: ChildProcess; meta: RunMeta; writeStream?: fs.WriteStream }>()
  private baseDir: string

  constructor(userDataDir?: string) {
    super()
    this.baseDir = userDataDir || path.join(getUserDataPath(), 'runs')
    try {
      fs.mkdirSync(this.baseDir, { recursive: true })
    } catch (e) {
      // ignore
    }
  }

  async startRun(stepName: string): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()
    const logPath = path.join(this.baseDir, `${runId}.log`)
    const meta: RunMeta = { runId, name: `Run ${stepName} ${new Date(startedAt).toISOString()}`, startedAt, logPath }

    // ensure directory
    fs.mkdirSync(path.dirname(logPath), { recursive: true })

    // spawn process
    const proc = spawn('aspire', ['do', stepName], { stdio: ['ignore', 'pipe', 'pipe'] })

    // open write stream
    const ws = fs.createWriteStream(logPath, { flags: 'a' })

    const runRecord = { proc, meta, writeStream: ws }
    this.runs.set(runId, runRecord)

    // wire stdout/stderr
    const handleChunk = (chunk: Buffer | string) => {
      const text = chunk.toString()
      ws.write(text)
      // split to lines and feed parser
      const lines = text.split(/\r?\n/)
      for (const ln of lines) {
        if (!ln) continue
        const events = parseLogLine(ln)
        for (const ev of events) {
          this.emit('event', { runId, event: ev })
        }
      }
    }

    proc.stdout?.on('data', handleChunk)
    proc.stderr?.on('data', handleChunk)

    proc.on('exit', (code) => {
      try { ws.end() } catch {}
      const finalText = `${new Date().toISOString()} (system) → process-exit code=${code}\n`
      try { fs.appendFileSync(logPath, finalText) } catch {}
      const ev: ParsedEvent = { timestamp: Date.now(), type: code === 0 ? 'success' : 'failure', text: finalText }
      this.emit('event', { runId, event: ev })
    })

    // persist metadata
    await fs.promises.writeFile(path.join(this.baseDir, `${runId}.meta.json`), JSON.stringify(meta, null, 2), 'utf-8')

    return runId
  }

  async stopRun(runId: string): Promise<void> {
    const rec = this.runs.get(runId)
    if (!rec) return
    try {
      rec.proc?.kill()
    } catch (e) {
      // ignore
    }
    try { rec.writeStream?.end() } catch {}
    this.runs.delete(runId)
  }

  async renameRun(runId: string, name: string): Promise<void> {
    const metaPath = path.join(this.baseDir, `${runId}.meta.json`)
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8')
      const meta = JSON.parse(raw)
      meta.name = name
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    } catch (e) {
      const meta = { runId, name, startedAt: Date.now() }
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    }
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>> {
    try {
      const files = await fs.promises.readdir(this.baseDir)
      const metas = [] as Array<{ runId: string; name?: string; startedAt: number }>
      for (const f of files) {
        if (!f.endsWith('.meta.json')) continue
        try {
          const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf-8')
          const meta = JSON.parse(raw)
          metas.push({ runId: meta.runId, name: meta.name, startedAt: meta.startedAt })
        } catch {}
      }
      return metas.sort((a, b) => b.startedAt - a.startedAt)
    } catch (e) {
      return []
    }
  }
}
