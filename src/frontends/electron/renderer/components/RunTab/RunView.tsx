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
  const [runState, setRunState] = useState<RunState>(() => {
    const visibleSteps = getTransitiveDependencies(graph, targetStepId)
    const initialStatuses: NodeStatusesMap = {}
    visibleSteps.forEach((id) => {
      initialStatuses[id] = ExecutionStatus.Pending
    })
    return {
      status: 'running',
      nodeStatuses: initialStatuses,
      logs: [],
      startTime: Date.now(),
      name: initialName || `Run ${targetStepId} ${new Date().toLocaleTimeString()}`,
    }
  })
  const [elapsed, setElapsed] = useState(0)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState(runState.name)

  // Utility to strip ANSI codes and normalize
  function stripAnsi(s: string): string {
    return s ? s.replace(/\x1b\[[0-9;]*m/g, '').trim().toLowerCase() : ''
  }

  // Map stepName (from logs) to stepId (from graph), robust to ANSI and case
  const stepNameToId = useMemo(() => {
    const map: Record<string, string> = {}
    graph.steps.forEach((s) => {
      map[stripAnsi(s.name)] = s.id
    })
    return map
  }, [graph])

  // Compute filtered graph and sidebar steps (only target step and its dependencies)
  const filteredGraph = useMemo((): PipelineGraph => {
    const visibleSteps = getTransitiveDependencies(graph, targetStepId)
    const filteredSteps = graph.steps.filter((s) => visibleSteps.has(s.id))
    const filteredEdges = graph.edges.filter(
      (e) => visibleSteps.has(e.source) && visibleSteps.has(e.target)
    )
    return {
      ...graph,
      steps: filteredSteps.map((s) => ({
        ...s,
        dependencies: s.dependencies?.filter((d) => visibleSteps.has(d)),
      })),
      edges: filteredEdges,
    }
  }, [graph, targetStepId])

  // Filter sidebar steps
  const filteredSteps = useMemo(() => {
    const visibleSteps = getTransitiveDependencies(graph, targetStepId)
    return graph.steps.filter((s) => visibleSteps.has(s.id))
  }, [graph, targetStepId])

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
        // eslint-disable-next-line no-console
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
}) => {
        if (data.runId !== runId) return
        setRunState((prev) => ({
          ...prev,
          status: data.status,
          nodeStatuses: { ...prev.nodeStatuses, },
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

  const handleKillRun = useCallback(async () => {
    if (window.electronAPI?.killRun) {
      await window.electronAPI.killRun(runId)
    }
  }, [runId])

  const handleSaveRename = useCallback(async () => {
    if (window.electronAPI?.renameRun) {
      await window.electronAPI.renameRun(runId, editName)
    }
    setRunState((prev) => ({ ...prev, name: editName }))
    setIsRenaming(false)
  }, [runId, editName])

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

  return (
    <div className="run-view" data-testid="run-view" data-run-id={runId}>
      <header className="run-header">
        <div className="run-header-left">
          {isRenaming ? (
            <input
              type="text"
              className="run-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              autoFocus
              data-testid="run-name-input"
            />
          ) : (
            <h2 className="run-name" onClick={() => setIsRenaming(true)} data-testid="run-name">
              {runState.name}
            </h2>
          )}
          <span className="run-badge" style={statusBadgeStyle[runState.status]} data-testid="run-status-badge">
            {runState.status === 'running' && '● '}
            {runState.status.charAt(0).toUpperCase() + runState.status.slice(1)}
          </span>
          <span className="run-timer">{formatElapsed(elapsed)}</span>
        </div>
        <div className="run-header-right">
          {runState.status === 'running' && (
            <button className="run-kill-btn" onClick={handleKillRun} data-testid="kill-run-btn">
              ■ Stop
            </button>
          )}
        </div>
      </header>

      <div className="run-content">
        <div className="run-graph-panel" style={{ width: `${splitPosition}%` }}>
          <RunGraphWithBadges
            graph={filteredGraph}
            nodeStatuses={runState.nodeStatuses}
            selectedStepId={selectedStepId}
            onSelectStep={handleNodeClick}
          />
          <Sidebar graph={graph} onSelectStep={handleNodeClick} />
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
        .run-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
        }
        .run-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .run-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .run-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #e0e0e0;
          cursor: pointer;
        }
        .run-name:hover {
          text-decoration: underline;
        }
        .run-name-input {
          font-size: 16px;
          font-weight: 600;
          background: #3c3c3c;
          border: 1px solid #0e639c;
          color: #e0e0e0;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .run-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .run-timer {
          color: #858585;
          font-size: 14px;
        }
        .run-kill-btn {
          padding: 6px 12px;
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .run-kill-btn:hover {
          background: #dc2626;
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

function StatusIndicator({ status }: { status: ExecutionStatus }) {
  const config: Record<ExecutionStatus, { symbol: string; color: string }> = {
    pending: { symbol: '○', color: '#858585' },
    running: { symbol: '◉', color: '#f59e0b' },
    success: { symbol: '✓', color: '#22c55e' },
    failed: { symbol: '✗', color: '#ef4444' },
    skipped: { symbol: '⊘', color: '#6b7280' },
  }

  return (
    <span
      style={{ color: config[status].color, fontSize: '14px', fontWeight: 'bold' }}
      data-testid={`status-indicator-${status}`}
    >
      {config[status].symbol}
    </span>
  )
}

// Export for test access
export { getTransitiveDependencies }
