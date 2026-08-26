import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import {
  RunEngine,
  type IRunService,
  type PipelineGraph,
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
  private engine = new RunEngine()
  private runs = new Map<
    string,
    { managedProc?: ManagedProcess; meta: RunMeta; writeStream?: fs.WriteStream }
  >()

  private processManager: ProcessManager
  private runStore?: FileRunStore
  private workspaceDir?: string

  constructor(userDataDir?: string, processManager?: ProcessManager, persistRuns = true) {
    super()
    const runsBaseDir = userDataDir || path.join(getDefaultUserDataPath(), 'runs')
    this.runStore = persistRuns ? new FileRunStore(runsBaseDir) : undefined
    this.processManager = processManager || new ProcessManager()

    this.engine.onOutput((payload) => this.emit('event', payload))
    this.engine.onStatusChange((payload) => this.emit('run-status-change', payload))
  }

  setWorkspaceDirectory(dir: string): void {
    this.workspaceDir = dir
  }

  getProcessManager(): ProcessManager {
    return this.processManager
  }

  getRunStore(): FileRunStore | undefined {
    return this.runStore
  }

  async startRun(stepName: string, graph?: PipelineGraph): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()
    const logPath = this.runStore
      ? path.join(this.runStore.getRunsDirectory(), `${runId}.log`)
      : ''

    const meta: RunMeta = {
      runId,
      name: `Run ${stepName} ${new Date(startedAt).toISOString()}`,
      startedAt,
      logPath,
      targetStepId: stepName,
      status: 'running',
    }

    await this.runStore?.saveInitialRun(runId, meta, graph)

    this.engine.startRun(
      runId,
      graph || { id: runId, steps: [{ id: stepName, name: stepName }], edges: [] },
      stepName
    )

    const ws = logPath ? fs.createWriteStream(logPath, { flags: 'a' }) : undefined
    const writeStreamReady = ws
      ? new Promise<void>((resolve, reject) => {
          ws.once('open', () => resolve())
          ws.once('error', reject)
        })
      : Promise.resolve()

    const managedProc = this.processManager.spawn('aspire', ['do', stepName, '--non-interactive'], {
      cwd: this.workspaceDir || process.cwd(),
      onRawStdout: (chunk) => {
        try {
          ws?.write(chunk)
        } catch {
          // ignore
        }
        this.engine.ingest(runId, 'stdout', chunk)
      },
      onRawStderr: (chunk) => {
        try {
          ws?.write(chunk)
        } catch {
          // ignore
        }
        this.engine.ingest(runId, 'stderr', chunk)
      },
    })

    this.runs.set(runId, { managedProc, meta, writeStream: ws })

    managedProc.completion.then(async ({ code }) => {
      this.engine.flush(runId)

      try {
        ws?.end()
      } catch {
        // ignore
      }

      const finalText = `${new Date().toISOString()} (system) → process-exit code=${code}\n`
      try {
        await this.runStore?.appendLog(runId, finalText)
      } catch {
        // ignore
      }

      this.engine.recordSyntheticEvent(runId, {
        timestamp: Date.now(),
        type: code === 0 ? 'success' : 'failure',
        text: finalText,
      })

      const finalStatus: 'success' | 'failed' = code === 0 ? 'success' : 'failed'
      this.engine.finishRun(runId, code ?? 1)

      await this.runStore?.updateMeta(runId, { status: finalStatus })
    })

    await writeStreamReady
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

    try {
      rec.writeStream?.end()
    } catch {
      // ignore
    }

    this.runs.delete(runId)
    this.engine.removeRun(runId)
  }

  async renameRun(runId: string, name: string): Promise<void> {
    await this.runStore?.renameRun(runId, name)
  }

  async getRunDetails(runId: string): Promise<RunDetails | null> {
    const details = await this.runStore?.getRunDetails(runId)
    if (!details) return null

    const activeState = this.engine.getRunState(runId)
    return activeState
      ? { ...details, logs: activeState.logs, nodeStatuses: activeState.nodeStatuses }
      : details
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>> {
    return this.runStore?.getRunHistory() ?? []
  }

  async getRunsDirectory(): Promise<string> {
    return this.runStore?.getRunsDirectory() ?? ''
  }
}
