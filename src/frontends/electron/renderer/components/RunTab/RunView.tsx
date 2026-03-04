import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { GraphView } from '../../../../shared/components/GraphView'
import { LogViewer, type LogLine } from './LogViewer'
import { Sidebar } from '../../../../shared/components/Sidebar'
import type { NodeStatusesMap } from './GraphNodeBadge'
import { ExecutionStatus, ParsedEvent } from '@aspire-pipeline-viewer/core'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

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
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState(runState.name)
  const [isLoading, setIsLoading] = useState(true)

  // Utility to strip ANSI codes and normalize
  function stripAnsi(s: string): string {
    // eslint-disable-next-line no-control-regex
    return s ? s.replace(/\u001b\[[0-9;]*m/g, '').trim().toLowerCase() : ''
  }

  // Map stepName (from logs) to stepId (from graph), robust to ANSI and case
  const stepNameToId = useMemo(() => {
    const map: Record<string, string> = {}
    runGraph.steps.forEach((s) => {
      map[stripAnsi(s.name)] = s.id
    })
    return map
  }, [runGraph])

  // Fetch persisted run details on mount
  useEffect(() => {
    async function loadRunDetails() {
      if (window.electronAPI?.getRunDetails) {
        try {
          const details = await window.electronAPI.getRunDetails(runId)
          console.log('[RunView] loaded run details from disk:', details?.meta?.runId, 'hasGraph:', !!details?.graph, 'log count:', details?.logs?.length)
          if (details) {
            if (details.graph) {
              console.log('[RunView] Setting runGraph to persisted history details.graph structure.')
              setRunGraph(details.graph)
            } else {
              console.log('[RunView] No saved graph found on disk. Falling back to active App graph context.')
            }
            
            // Overwrite targetStepId with the explicitly loaded correct historical target metadata
            const loadedTargetId = details.meta.targetStepId || targetStepId

            // Reconstruct node statuses and logs
            const g = details.graph || graph
            if (!g) {
              console.warn('No graph available for run details reconstruction')
              return
            }
            
            // Ensure we actually try to parse something regardless of targetStepId if the history implies it ran the whole thing
            // Fallback to plotting the full graph if targetStepId doesn't exist in historical graph
            let actualTargetId = loadedTargetId
            if (!g.steps.find((s) => s.id === actualTargetId)) {
              console.warn(`[RunView] Target step ${actualTargetId} not found in historical graph, using full graph.`)
              if (g.steps.length > 0) {
                  // Heuristic: If target step missing, just use any valid root or simply skip the strict filtering downstream
              }
            }
  
            const visibleSteps = getTransitiveDependencies(g, actualTargetId)
            console.log(`[RunView] Visible steps (transitive dependencies for ${actualTargetId}):`, Array.from(visibleSteps))
            const reconstructedStatuses: NodeStatusesMap = {}
            visibleSteps.forEach((id) => {
              reconstructedStatuses[id] = ExecutionStatus.Pending
            })
            
            const reconstructedLogs: LogLine[] = []
            let isFailed = false
            let isFinal = false
            
            // Map stepName helper
            const localStepNameToId: Record<string, string> = {}
            g.steps.forEach((s) => {
              localStepNameToId[stripAnsi(s.name)] = s.id
            })

            details.logs.forEach(event => {
              let stepId = event.stepName && localStepNameToId[stripAnsi(event.stepName)]
              if (!stepId && event.stepName) {
                const fallback = Object.entries(localStepNameToId).find(([k]) => event.stepName && k.includes(stripAnsi(event.stepName!)))
                if (fallback) stepId = fallback[1]
              }
              
              if (stepId) {
                if (event.type === 'start' && reconstructedStatuses[stepId] === ExecutionStatus.Pending) {
                  reconstructedStatuses[stepId] = ExecutionStatus.Running
                } else if (event.type === 'success') {
                  reconstructedStatuses[stepId] = ExecutionStatus.Success
                } else if (event.type === 'failure') {
                  reconstructedStatuses[stepId] = ExecutionStatus.Failed
                  isFailed = true
                }
              }
              
              if (event.type === 'success' || event.type === 'failure') {
                if (event.text.includes('process-exit')) {
                  isFinal = true
                  if (event.type === 'failure') isFailed = true
                }
              }
              
              // Only push to array if there is actual text to log (avoids duplicating metadata-only events if any)
              if (event.text) {
                reconstructedLogs.push({
                  timestamp: event.timestamp,
                  text: event.text,
                  stepName: event.stepName,
                  stepId: stepId,
                  type: event.type
                } as LogLine) // Cast to bypass TS if LogLine types mismatch occasionally locally
              }
            })

            setRunState({
              status: isFinal ? (isFailed ? 'failed' : 'success') : 'running',
              nodeStatuses: reconstructedStatuses,
              logs: reconstructedLogs,
              startTime: details.meta.startedAt,
              name: details.meta.name || `Run ${targetStepId}`,
            })
            setEditName(details.meta.name || `Run ${targetStepId}`)
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
      setIsLoading(false)
    }
    
    loadRunDetails()
  }, [runId, targetStepId, graph])

  // Compute filtered graph and sidebar steps using runGraph
  const filteredGraph = useMemo((): PipelineGraph => {
    // If we loaded a graph from history but targetStepId is 'History' (dummy),
    // or isn't legitimately in the graph, we should render the *entire* graph.
    const actualTargetInGraph = runGraph.steps.find(s => s.id === targetStepId)
    if (!actualTargetInGraph) {
      console.log(`[RunView] Computed filtered graph: targetStepId ${targetStepId} not found, showing full graph.`, runGraph)
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

  // // Filter sidebar steps
  // const filteredSteps = useMemo(() => {
  //   const visibleSteps = getTransitiveDependencies(graph, targetStepId)
  //   return graph.steps.filter((s) => visibleSteps.has(s.id))
  // }, [graph, targetStepId])

  // Sync tab rename when updated via context menu in container, or via getRunDetails
  useEffect(() => {
    if (initialName && initialName !== runState.name && !isLoading) {
      setRunState(prev => ({ ...prev, name: initialName }))
    }
  }, [initialName, runState.name, isLoading])


  // Subscribe to run events from electronAPI
  useEffect(() => {
    if (!window.electronAPI?.onRunOutput || !window.electronAPI?.onRunStatusChange) {
      return
    }

    const unsubOutput = window.electronAPI.onRunOutput(
      (data: { runId: string; event: ParsedEvent }) => {
        if (data.runId !== runId) return
        const event = data.event
        // Debug: log raw and processed log info to the console for troubleshooting
        console.log('[RunView] Log received:', {
          raw: event,
          strippedStepName: event.stepName ? stripAnsi(event.stepName) : undefined,
          mappedStepId: event.stepName ? stepNameToId[stripAnsi(event.stepName)] : undefined
        });
        // Attach stepId to log for filtering (robust to ANSI/case)
        let stepId = event.stepName && stepNameToId[stripAnsi(event.stepName)]
        // Fallback: if not found, try direct match (legacy)
        if (!stepId && event.stepName) {
          const fallback = Object.entries(stepNameToId).find(([k]) => event.stepName && k.includes(stripAnsi(event.stepName!)))
          if (fallback) stepId = fallback[1]
        }
        setRunState((prev) => {
          // Update status based on event type
          let updatedStatuses = { ...prev.nodeStatuses }
          if (stepId) {
            if (event.type === 'start' && updatedStatuses[stepId] === ExecutionStatus.Pending) {
              updatedStatuses[stepId] = ExecutionStatus.Running
            } else if (event.type === 'success') {
              updatedStatuses[stepId] = ExecutionStatus.Success
            } else if (event.type === 'failure') {
              updatedStatuses[stepId] = ExecutionStatus.Failed
            }
          }
          return {
            ...prev,
            logs: [...prev.logs, { timestamp: event.timestamp, text: event.text, stepName: event.stepName, stepId, type: event.type }],
            nodeStatuses: updatedStatuses,
          }
        })
      }
    )

    const unsubStatus = window.electronAPI.onRunStatusChange(
      (data: {
  runId: string
  status: 'running' | 'success' | 'failed'
  nodeStatuses?: Record<string, ExecutionStatus>
}) => {
        if (data.runId !== runId) return
        setRunState((prev) => ({
          ...prev,
          status: data.status,
          nodeStatuses: { ...prev.nodeStatuses, ...data.nodeStatuses },
        }))
      }
    )

    return () => {
      unsubOutput?.()
      unsubStatus?.()
    }
  }, [runId, graph, stepNameToId])

  // Elapsed time counter
  useEffect(() => {
    if (runState.status !== 'running') return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runState.startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [runState.status, runState.startTime])

  const formatElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Bubble up internal state to parent container so tabs can show {status icon} {name} (time s)
  useEffect(() => {
    // Dispatch a custom synthetic event so RunTabContainer can pick up live updates if needed
    // or we can rely on RunTabContainer subscribing to the IPC directly.
    // Since App state handles tab array, we will just fire a custom event on window
    const evt = new CustomEvent(`run-tab-update-${runId}`, {
      detail: { status: runState.status, name: runState.name, elapsed }
    });
    window.dispatchEvent(evt);
  }, [runId, runState.status, runState.name, elapsed])

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

  // Status badge colors
  const statusBadgeStyle: Record<string, React.CSSProperties> = {
    running: { background: '#f59e0b', color: '#000' },
    success: { background: '#22c55e', color: '#000' },
    failed: { background: '#ef4444', color: '#fff' },
  }

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
