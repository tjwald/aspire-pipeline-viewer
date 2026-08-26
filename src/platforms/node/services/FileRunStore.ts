import fs from 'fs'
import path from 'path'
import { parseLogLine, type PipelineGraph, type RunMeta, type RunDetails, type ParsedEvent } from '@aspire-pipeline-viewer/core'

export class FileRunStore {
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
    try {
      fs.mkdirSync(this.baseDir, { recursive: true })
    } catch {
      // ignore
    }
  }

  getRunsDirectory(): string {
    return this.baseDir
  }

  async saveInitialRun(runId: string, meta: RunMeta, graph?: PipelineGraph): Promise<void> {
    await fs.promises.mkdir(this.baseDir, { recursive: true })

    if (graph) {
      await fs.promises.writeFile(
        path.join(this.baseDir, `${runId}.graph.json`),
        JSON.stringify(graph, null, 2),
        'utf-8'
      )
    }

    await fs.promises.writeFile(
      path.join(this.baseDir, `${runId}.meta.json`),
      JSON.stringify(meta, null, 2),
      'utf-8'
    )
  }

  async updateMeta(runId: string, updates: Partial<RunMeta>): Promise<void> {
    const metaPath = path.join(this.baseDir, `${runId}.meta.json`)
    try {
      if (fs.existsSync(metaPath)) {
        const raw = await fs.promises.readFile(metaPath, 'utf-8')
        const current = JSON.parse(raw) as RunMeta
        const updated = { ...current, ...updates }
        await fs.promises.writeFile(metaPath, JSON.stringify(updated, null, 2), 'utf-8')
      }
    } catch {
      // ignore
    }
  }

  async renameRun(runId: string, name: string): Promise<void> {
    await this.updateMeta(runId, { name })
  }

  async appendLog(runId: string, text: string): Promise<void> {
    const logPath = path.join(this.baseDir, `${runId}.log`)
    try {
      await fs.promises.appendFile(logPath, text, 'utf-8')
    } catch {
      // ignore
    }
  }

  async getRunDetails(runId: string): Promise<RunDetails | null> {
    const metaPath = path.join(this.baseDir, `${runId}.meta.json`)
    const logPath = path.join(this.baseDir, `${runId}.log`)
    const graphPath = path.join(this.baseDir, `${runId}.graph.json`)

    if (!fs.existsSync(metaPath)) {
      return null
    }

    try {
      const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8')) as RunMeta
      let graph: PipelineGraph | null = null
      if (fs.existsSync(graphPath)) {
        graph = JSON.parse(await fs.promises.readFile(graphPath, 'utf-8')) as PipelineGraph
      }

      const logs: ParsedEvent[] = []
      if (fs.existsSync(logPath)) {
        const logContent = await fs.promises.readFile(logPath, 'utf-8')
        const lines = logContent.split('\n')
        for (const line of lines) {
          const ev = parseLogLine(line)
          if (ev) logs.push(ev)
        }
      }

      return { meta, graph, logs }
    } catch {
      return null
    }
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>> {
    try {
      if (!fs.existsSync(this.baseDir)) return []
      const files = await fs.promises.readdir(this.baseDir)
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'))

      const history: Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }> = []
      for (const file of metaFiles) {
        try {
          const raw = await fs.promises.readFile(path.join(this.baseDir, file), 'utf-8')
          const meta = JSON.parse(raw) as RunMeta
          history.push({
            runId: meta.runId,
            name: meta.name,
            startedAt: meta.startedAt,
            targetStepId: meta.targetStepId,
          })
        } catch {
          // ignore corrupted file
        }
      }

      return history.sort((a, b) => b.startedAt - a.startedAt)
    } catch {
      return []
    }
  }
}
