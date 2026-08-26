import type { PipelineGraph, ParsedEvent } from '../domain/types'
import { parseLogLine } from '../domain/logParser'
import { filterGraphForTarget } from '../domain/graphUtils'
import { buildStepAliasMap, resolveStepId, nextStepStatus } from '../domain/stepResolution'

export type StepStatus = 'pending' | 'running' | 'success' | 'failed'

export interface RunEngineEvent {
  runId: string
  event: ParsedEvent & { stepId?: string }
}

export interface RunStatusChange {
  runId: string
  status: 'running' | 'success' | 'failed'
  nodeStatuses: Record<string, StepStatus>
}

type OutputListener = (payload: RunEngineEvent) => void
type StatusListener = (payload: RunStatusChange) => void

interface RunState {
  graph: PipelineGraph
  targetStepId: string
  aliasMap: Record<string, string>
  nodeStatuses: Record<string, StepStatus>
  logs: Array<ParsedEvent & { stepId?: string }>
  status: 'running' | 'success' | 'failed'
  stdoutBuffer: string
  stderrBuffer: string
}

/**
 * Platform-agnostic engine that turns raw process output into parsed events and
 * per-step statuses. Contains no Node/Electron dependencies so it is fully unit testable.
 */
export class RunEngine {
  private runs = new Map<string, RunState>()
  private outputListeners = new Set<OutputListener>()
  private statusListeners = new Set<StatusListener>()

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.add(listener)
    return () => this.outputListeners.delete(listener)
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  startRun(runId: string, graph: PipelineGraph, targetStepId: string): void {
    const scopedGraph = graph.steps.find((s) => s.id === targetStepId)
      ? filterGraphForTarget(graph, targetStepId)
      : graph

    const nodeStatuses: Record<string, StepStatus> = {}
    scopedGraph.steps.forEach((step) => {
      nodeStatuses[step.id] = 'pending'
    })

    this.runs.set(runId, {
      graph: scopedGraph,
      targetStepId,
      aliasMap: buildStepAliasMap(scopedGraph),
      nodeStatuses,
      logs: [],
      status: 'running',
      stdoutBuffer: '',
      stderrBuffer: '',
    })
  }

  /** Feed a raw chunk of process output (stdout or stderr) for a run. */
  ingest(runId: string, stream: 'stdout' | 'stderr', chunk: string): void {
    const run = this.runs.get(runId)
    if (!run) return

    const bufferKey = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer'
    run[bufferKey] += chunk

    let idx
    while ((idx = run[bufferKey].indexOf('\n')) >= 0) {
      const lineEnd = idx > 0 && run[bufferKey][idx - 1] === '\r' ? idx - 1 : idx
      const line = run[bufferKey].slice(0, lineEnd)
      run[bufferKey] = run[bufferKey].slice(idx + 1)
      this.processLine(runId, run, line)
    }
  }

  /** Flush any trailing partial line (call on process exit before finishRun). */
  flush(runId: string): void {
    const run = this.runs.get(runId)
    if (!run) return

    if (run.stdoutBuffer.length > 0) {
      this.processLine(runId, run, run.stdoutBuffer)
      run.stdoutBuffer = ''
    }
    if (run.stderrBuffer.length > 0) {
      this.processLine(runId, run, run.stderrBuffer)
      run.stderrBuffer = ''
    }
  }

  finishRun(runId: string, exitCode: number): void {
    const run = this.runs.get(runId)
    if (!run) return

    run.status = exitCode === 0 ? 'success' : 'failed'
    this.notifyStatus(runId, run)
  }

  /** Record an event that did not come from a parsed output line (e.g. a process-exit marker). */
  recordSyntheticEvent(runId: string, event: ParsedEvent, stepId?: string): void {
    const run = this.runs.get(runId)
    if (!run) return

    const enriched = { ...event, stepId }
    run.logs.push(enriched)
    this.outputListeners.forEach((listener) => listener({ runId, event: enriched }))
  }

  getRunState(runId: string): { status: RunState['status']; nodeStatuses: Record<string, StepStatus>; logs: RunState['logs'] } | undefined {
    const run = this.runs.get(runId)
    if (!run) return undefined
    return { status: run.status, nodeStatuses: { ...run.nodeStatuses }, logs: [...run.logs] }
  }

  removeRun(runId: string): void {
    this.runs.delete(runId)
  }

  private processLine(runId: string, run: RunState, line: string): void {
    const parsed = parseLogLine(line)
    if (!parsed) return

    const stepId = resolveStepId(run.aliasMap, parsed.stepName)
    const event = { ...parsed, stepId }
    run.logs.push(event)

    if (stepId) {
      const next = nextStepStatus(run.nodeStatuses[stepId], parsed.type)
      if (next && next !== run.nodeStatuses[stepId]) {
        run.nodeStatuses[stepId] = next
        this.notifyStatus(runId, run)
      }
    }

    this.outputListeners.forEach((listener) => listener({ runId, event }))
  }

  private notifyStatus(runId: string, run: RunState): void {
    this.statusListeners.forEach((listener) =>
      listener({ runId, status: run.status, nodeStatuses: { ...run.nodeStatuses } })
    )
  }
}
