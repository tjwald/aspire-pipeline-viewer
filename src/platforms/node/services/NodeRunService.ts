import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import {
  parseLogLine,
  type IRunService,
  type PipelineGraph,
  type ParsedEvent,
  type RunMeta,
  type RunDetails,
} from '@aspire-pipeline-viewer/core'
import { ProcessManager, type ManagedProcess } from '../process/ProcessManager'
import { FileRunStore } from './FileRunStore'

function getDefaultUserDataPath(): string {
  try {
    // Check if running inside Electron without hard compile-time dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron')
    return electron.app?.getPath?.('userData') || process.cwd()
  } catch {
    return process.cwd()
  }
}

export class NodeRunService extends EventEmitter implements IRunService {
  private runs = new Map<
    string,
    { managedProc?: ManagedProcess; meta: RunMeta; writeStream?: fs.WriteStream }
  >()

  private processManager: ProcessManager
  private runStore: FileRunStore
  private workspaceDir?: string

  constructor(userDataDir?: string, processManager?: ProcessManager) {
    super()
    const runsBaseDir = userDataDir || path.join(getDefaultUserDataPath(), 'runs')
    this.runStore = new FileRunStore(runsBaseDir)
    this.processManager = processManager || new ProcessManager()
  }

  setWorkspaceDirectory(dir: string): void {
    this.workspaceDir = dir
  }

  getProcessManager(): ProcessManager {
    return this.processManager
  }

  getRunStore(): FileRunStore {
    return this.runStore
  }

  async startRun(stepName: string, graph?: PipelineGraph): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()
    const logPath = path.join(this.runStore.getRunsDirectory(), `${runId}.log`)

    const meta: RunMeta = {
      runId,
      name: `Run ${stepName} ${new Date(startedAt).toISOString()}`,
      startedAt,
      logPath,
      targetStepId: stepName,
      status: 'running',
    }

    await this.runStore.saveInitialRun(runId, meta, graph)

    const ws = fs.createWriteStream(logPath, { flags: 'a' })

    const managedProc = this.processManager.spawn('aspire', ['do', stepName, '--non-interactive'], {
      cwd: this.workspaceDir || process.cwd(),
      onRawStdout: (chunk) => {
        try {
          ws.write(chunk)
        } catch {
          // ignore
        }
      },
      onRawStderr: (chunk) => {
        try {
          ws.write(chunk)
        } catch {
          // ignore
        }
      },
      onStdoutLine: (line) => {
        const ev = parseLogLine(line)
        if (ev) this.emit('event', { runId, event: ev })
      },
      onStderrLine: (line) => {
        const ev = parseLogLine(line)
        if (ev) this.emit('event', { runId, event: ev })
      },
    })

    this.runs.set(runId, { managedProc, meta, writeStream: ws })

    managedProc.completion.then(async ({ code }) => {
      try {
        ws.end()
      } catch {
        // ignore
      }

      const finalText = `${new Date().toISOString()} (system) → process-exit code=${code}\n`
      try {
        await this.runStore.appendLog(runId, finalText)
      } catch {
        // ignore
      }

      const ev: ParsedEvent = {
        timestamp: Date.now(),
        type: code === 0 ? 'success' : 'failure',
        text: finalText,
      }

      this.emit('event', { runId, event: ev })

      const finalStatus: 'success' | 'failed' = code === 0 ? 'success' : 'failed'

      this.emit('run-status-change', {
        runId,
        status: finalStatus,
      })

      await this.runStore.updateMeta(runId, { status: finalStatus })
    })

    return runId
  }

  async stopRun(runId: string): Promise<void> {
    const rec = this.runs.get(runId)
    if (!rec) return

    try {
      await rec.managedProc?.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  async renameRun(runId: string, name: string): Promise<void> {
    await this.runStore.renameRun(runId, name)
  }

  async getRunDetails(runId: string): Promise<RunDetails | null> {
    return this.runStore.getRunDetails(runId)
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>> {
    return this.runStore.getRunHistory()
  }

  async getRunsDirectory(): Promise<string> {
    return this.runStore.getRunsDirectory()
  }
}
