import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { GraphView } from '../../../../shared/components/GraphView'
import { Sidebar } from '../../../../shared/components/Sidebar'
import type { NodeStatusesMap } from '../../../../shared/components/GraphNodeBadge'
import { LogViewer, type LogLine } from './LogViewer'
import { ExecutionStatus, ParsedEvent } from '@aspire-pipeline-viewer/core'
import type { PipelineGraph, RunStatusChange, StepStatus } from '@aspire-pipeline-viewer/core'

export interface RunViewProps {
  runId: string
  graph: PipelineGraph
  targetStepId: string
  initialName?: string
}

interface RunState {
  status: 'running' | 'success' | 'failed'
  nodeStatuses: NodeStatusesMap
  logs: LogLine[]
  startTime: number
  name: string
}

interface RunMeta {
  runId: string
  name?: string
  startedAt: number
  logPath: string
  targetStepId?: string
  status?: 'running' | 'success' | 'failed'
}

interface RunDetailsResponse {
  meta: RunMeta
  graph?: PipelineGraph
  logs: (ParsedEvent & { stepId?: string })[]
  nodeStatuses?: Record<string, StepStatus>
}

interface RunOutputData {
  runId: string
  event: ParsedEvent & { stepId?: string }
}

type RunStatusData = RunStatusChange

/**
 * Get the transitive dependencies of a step (including the step itself)
 */
function getTransitiveDependencies(graph: PipelineGraph, stepId: string): Set<string> {
  const result = new Set<string>([stepId])
  const step = graph.steps.find((s) => s.id === stepId)

  if (!step?.dependencies) return result

  const queue = [...step.dependencies]
  while (queue.length > 0) {
    const depId = queue.shift()!
    if (result.has(depId)) continue
    result.add(depId)
    const depStep = graph.steps.find((s) => s.id === depId)
    if (depStep?.dependencies) {
      queue.push(...depStep.dependencies)
    }
  }

  return result
}

export function RunView({ runId, graph, targetStepId, initialName }: RunViewProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>()
  const [splitPosition, setSplitPosition] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [runGraph, setRunGraph] = useState<PipelineGraph>(graph)
  const [runState, setRunState] = useState<RunState>({
    status: 'running',
    nodeStatuses: {},
    logs: [],
    startTime: Date.now(),
    name: initialName || `Run ${targetStepId} ${new Date().toLocaleTimeString()}`,
  })
  const [elapsed, setElapsed] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const isHydrated = useRef(false)
  const bufferedOutput = useRef<RunOutputData[]>([])
  const bufferedStatus = useRef<RunStatusData[]>([])

  const applyOutput = useCallback((data: RunOutputData) => {
    if (data.runId !== runId || !data.event.text) return
    const event = data.event
    setRunState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          timestamp: event.timestamp,
          text: event.text,
          source: event.source,
          stepName: event.stepName,
          stepId: event.stepId,
          type: event.type,
        },
      ],
    }))
  }, [runId])

  const applyStatus = useCallback((data: RunStatusData) => {
    if (data.runId !== runId) return
    setRunState((prev) => ({
      ...prev,
      status: data.status,
      nodeStatuses: { ...prev.nodeStatuses, ...data.nodeStatuses },
    }))
  }, [runId])

  // Fetch persisted/active run state on mount. Step->id resolution and per-step
  // status derivation happens once, in the core RunEngine, so we just trust it here.
  useEffect(() => {
    async function loadRunDetails() {
      if (window.electronAPI?.getRunDetails) {
        try {
          const details = (await window.electronAPI.getRunDetails(runId)) as RunDetailsResponse | null
          if (details) {
            const g = details.graph || graph
            if (details.graph) {
              setRunGraph(details.graph)
            }

            const nodeStatuses: NodeStatusesMap = details.nodeStatuses
              ? { ...details.nodeStatuses }
              : (() => {
                  const fallback: NodeStatusesMap = {}
                  getTransitiveDependencies(g, details.meta.targetStepId || targetStepId).forEach((id) => {
                    fallback[id] = ExecutionStatus.Pending
                  })
                  return fallback
                })()

            const logs: LogLine[] = details.logs
              .filter((event) => !!event.text)
              .map((event) => ({
                timestamp: event.timestamp,
                text: event.text,
                source: event.source,
                stepId: event.stepId,
                stepName: event.stepName,
                type: event.type,
              }))

            setRunState({
              status: details.meta.status || 'running',
              nodeStatuses,
              logs,
              startTime: details.meta.startedAt,
              name: details.meta.name || `Run ${targetStepId}`,
            })
          }
        } catch (err) {
          console.error('Failed to load run details:', err)
        }
      } else {
        // Fallback for non-electron env
        const visibleSteps = getTransitiveDependencies(graph, targetStepId)
        const initialStatuses: NodeStatusesMap = {}
        visibleSteps.forEach((id) => {
          initialStatuses[id] = ExecutionStatus.Pending
        })
        setRunState(s => ({ ...s, nodeStatuses: initialStatuses }))
      }
      isHydrated.current = true
      bufferedOutput.current.splice(0).forEach(applyOutput)
      bufferedStatus.current.splice(0).forEach(applyStatus)
      setIsLoading(false)
    }
    
    loadRunDetails()
  }, [runId, targetStepId, graph, applyOutput, applyStatus])

  // Compute filtered graph and sidebar steps using runGraph
  const filteredGraph = useMemo((): PipelineGraph => {
    // If we loaded a graph from history but targetStepId is 'History' (dummy),
    // or isn't legitimately in the graph, we should render the *entire* graph.
    const actualTargetInGraph = runGraph.steps.find(s => s.id === targetStepId)
    if (!actualTargetInGraph) {
      return runGraph
    }

    const visibleSteps = getTransitiveDependencies(runGraph, targetStepId)
    const filteredSteps = runGraph.steps.filter((s) => visibleSteps.has(s.id))
    const filteredEdges = runGraph.edges.filter(
      (e) => visibleSteps.has(e.source) && visibleSteps.has(e.target)
    )
    return {
      ...runGraph,
      steps: filteredSteps.map((s) => ({
        ...s,
        dependencies: s.dependencies?.filter((d) => visibleSteps.has(d)),
      })),
      edges: filteredEdges,
    }
  }, [runGraph, targetStepId])

  // Sync tab rename when updated via context menu in container, or via getRunDetails
  useEffect(() => {
    if (initialName && initialName !== runState.name && !isLoading) {
      setRunState(prev => ({ ...prev, name: initialName }))
    }
  }, [initialName, runState.name, isLoading])


  // Subscribe to live run events from electronAPI. The core RunEngine has already
  // resolved stepId and derived per-step status, so the renderer only appends/merges.
  useEffect(() => {
    if (!window.electronAPI?.onRunOutput || !window.electronAPI?.onRunStatusChange) {
      return
    }

    const unsubOutput = window.electronAPI.onRunOutput(
      (data: RunOutputData) => {
        if (!isHydrated.current) {
          bufferedOutput.current.push(data)
          return
        }
        applyOutput(data)
      }
    )

    const unsubStatus = window.electronAPI.onRunStatusChange(
      (data: RunStatusData) => {
        if (!isHydrated.current) {
          bufferedStatus.current.push(data)
          return
        }
        applyStatus(data)
      }
    )

    return () => {
      unsubOutput?.()
      unsubStatus?.()
    }
  }, [applyOutput, applyStatus])

  // Elapsed time counter
  useEffect(() => {
    if (runState.status !== 'running') return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runState.startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [runState.status, runState.startTime])

  // Bubble up internal state to parent container so tabs can show {status icon} {name} (time s)
  useEffect(() => {
    // Don't broadcast updates until we've finished loading persisted state,
    // otherwise we might briefly broadcast a default 'running' status for a finished run.
    if (isLoading) return;

    // Dispatch a custom synthetic event so RunTabContainer can pick up live updates if needed
    // or we can rely on RunTabContainer subscribing to the IPC directly.
    // Since App state handles tab array, we will just fire a custom event on window
    const evt = new CustomEvent(`run-tab-update-${runId}`, {
      detail: { status: runState.status, name: runState.name, elapsed }
    });
    window.dispatchEvent(evt);
  }, [runId, runState.status, runState.name, elapsed, isLoading])

  const handleNodeClick = (stepId: string) => {
    // Toggle selection - clicking same node deselects
    setSelectedStepId((prev) => (prev === stepId ? undefined : stepId))
  }

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const container = document.querySelector('.run-content')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPosition(Math.max(20, Math.min(80, newPosition)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (isLoading) {
    return (
      <div className="run-view" data-testid="run-view" data-run-id={runId}>
        <div style={{ padding: '20px', color: '#858585' }}>Loading run data...</div>
      </div>
    )
  }

  return (
    <div className="run-view" data-testid="run-view" data-run-id={runId}>
      <div className="run-content">
        <div className="run-graph-panel" style={{ width: `${splitPosition}%` }}>
          <RunGraphWithBadges
            graph={filteredGraph}
            nodeStatuses={runState.nodeStatuses}
            selectedStepId={selectedStepId}
            onSelectStep={handleNodeClick}
          />
          <Sidebar graph={runGraph} onSelectStep={handleNodeClick} />
        </div>
        <div
          className="run-splitter"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'col-resize' : 'col-resize' }}
        />
        <div className="run-log-panel" style={{ width: `${100 - splitPosition}%` }}>
          <LogViewer logs={runState.logs} selectedStepId={selectedStepId} />
        </div>
      </div>

      <style>{`
        .run-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #1e1e1e;
        }
        .run-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
          width: 100%;
        }
        .run-graph-panel {
          min-width: 200px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .run-splitter {
          width: 4px;
          background: #3c3c3c;
          cursor: col-resize;
          flex-shrink: 0;
          user-select: none;
        }
        .run-splitter:hover {
          background: #0e639c;
        }
        .run-log-panel {
          min-width: 200px;
          overflow: hidden;
          flex: 1;
        }
      `}</style>
    </div>
  )
}

/**
 * Wrapper component that overlays status badges on GraphView nodes
 */
interface RunGraphWithBadgesProps {
  graph: PipelineGraph
  nodeStatuses: NodeStatusesMap
  selectedStepId?: string
  onSelectStep?: (id: string) => void
}

function RunGraphWithBadges({ graph, nodeStatuses, selectedStepId, onSelectStep }: RunGraphWithBadgesProps) {
  return (
    <div className="run-graph-wrapper" data-testid="run-graph-wrapper">
      <GraphView
        graph={graph}
        selectedStepId={selectedStepId}
        onSelectStep={onSelectStep}
        nodeStatuses={nodeStatuses}
      />
    </div>
  )
}

// Export for test access
export { getTransitiveDependencies }
