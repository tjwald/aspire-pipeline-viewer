import React, { useState, useCallback } from 'react'
import { Sidebar } from '../../shared/components/Sidebar'
import { GraphView } from '../../shared/components/GraphView'
import { DetailsPanel } from '../../shared/components/DetailsPanel'
import { ErrorBoundary } from '../../shared/components/ErrorBoundary'
import { RunTabContainer, useRunTabs } from './components/RunTab'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'
import '../../shared/styles/base.css'
import '../../shared/styles/sidebar.css'
import '../../shared/styles/graph.css'
import '../../shared/styles/details.css'
import '../../shared/styles/toolbar.css'

// Check if running in Electron environment
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined

type ViewMode = 'graph' | 'runs'

export default function App() {
  const [graph, setGraph] = useState<PipelineGraph | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>()
  const [workspaceName, setWorkspaceName] = useState<string | undefined>()
  const [workspacePath, setWorkspacePath] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleStepIds, setVisibleStepIds] = useState<Set<string> | undefined>()
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const { tabs: runTabs, addTab: addRunTab, removeTab: removeRunTab } = useRunTabs()

  const handleOpenWorkspace = useCallback(async () => {
    if (!window.electronAPI) {
      setError('electronAPI not available - are you running in Electron?')
      console.error('window.electronAPI is undefined')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const dir = await window.electronAPI.selectApphostDirectory()
      if (!dir) {
        setLoading(false)
        return
      }

      setWorkspacePath(dir)
      setWorkspaceName(dir.split(/[\\/]/).pop() || dir)

      console.log('Loading diagnostics from:', dir)
      const result = await window.electronAPI.getApphostDiagnostics(dir)
      console.log('Diagnostics result:', result)
      if (result?.output) {
        console.log('Parsing output, length:', result.output.length)
        const { parseDiagnostics } = await import('@aspire-pipeline-viewer/core')
        const pipelineGraph = parseDiagnostics(result.output)
        console.log('Parsed graph:', pipelineGraph)
        setGraph(pipelineGraph)
      } else {
        setError(`No diagnostics output received. Exit code: ${result?.code}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handler to start a run (Electron only)
  const handleStartRun = useCallback(
    async (stepId: string) => {
      if (!isElectron || !window.electronAPI?.runStep) {
        console.warn('Run functionality is only available in Electron')
        return
      }
      try {
        const runId = await window.electronAPI.runStep(stepId, graph || undefined)
        addRunTab(runId, stepId, `Run ${stepId} ${new Date().toLocaleTimeString()}`)
        setViewMode('runs')
      } catch (err) {
        console.error('Failed to start run:', err)
      }
    },
    [addRunTab, graph]
  )

  if (!graph) {
    return (
      <div className="app-container" style={{ display: 'flex', height: '100vh' }}>
        <Sidebar
          graph={{ id: '', name: '', steps: [], edges: [] }}
          onOpenWorkspace={handleOpenWorkspace}
          workspaceName={workspaceName}
          workspacePath={workspacePath}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ color: '#858585' }}>Loading diagnostics...</div>
          ) : error ? (
            <div style={{ color: '#ef4444' }}>{error}</div>
          ) : (
            <div style={{ color: '#858585' }}>Select a workspace to load pipeline</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh' }}>
      <ErrorBoundary section="Sidebar">
        <Sidebar
          graph={graph}
          selectedStepId={selectedStepId}
          onSelectStep={setSelectedStepId}
          onVisibleStepsChange={setVisibleStepIds}
          workspaceName={workspaceName}
          workspacePath={workspacePath}
          onOpenWorkspace={handleOpenWorkspace}
        />
      </ErrorBoundary>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* View mode tabs (Electron only) */}
        {isElectron && (
          <div className="view-mode-tabs" style={{ display: 'flex', background: '#252526', borderBottom: '1px solid #3c3c3c' }}>
            <button
              className={`view-mode-tab ${viewMode === 'graph' ? 'active' : ''}`}
              onClick={() => setViewMode('graph')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'graph' ? '#1e1e1e' : 'transparent',
                border: 'none',
                borderBottom: viewMode === 'graph' ? '2px solid #0e639c' : '2px solid transparent',
                color: viewMode === 'graph' ? '#e0e0e0' : '#858585',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              data-testid="view-mode-graph"
            >
              📊 Pipeline Graph
            </button>
            <button
              className={`view-mode-tab ${viewMode === 'runs' ? 'active' : ''}`}
              onClick={() => setViewMode('runs')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'runs' ? '#1e1e1e' : 'transparent',
                border: 'none',
                borderBottom: viewMode === 'runs' ? '2px solid #0e639c' : '2px solid transparent',
                color: viewMode === 'runs' ? '#e0e0e0' : '#858585',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              data-testid="view-mode-runs"
            >
              ▶️ Runs {runTabs?.length > 0 && `(${runTabs.length})`}
            </button>
          </div>
        )}

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {viewMode === 'graph' ? (
            <>
              <ErrorBoundary section="Graph View">
                <GraphView
                  graph={graph}
                  selectedStepId={selectedStepId}
                  onSelectStep={setSelectedStepId}
                  visibleStepIds={visibleStepIds}
                  onRunStep={isElectron ? handleStartRun : undefined}
                />
              </ErrorBoundary>
              <ErrorBoundary section="Details Panel">
                <DetailsPanel
                  graph={graph}
                  selectedStepId={selectedStepId}
                  onRunStep={isElectron ? handleStartRun : undefined}
                />
              </ErrorBoundary>
            </>
          ) : (
            <ErrorBoundary section="Run Tabs">
              <RunTabContainer
                graph={graph}
                tabs={runTabs}
                onCloseTab={removeRunTab}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}

// Re-export for testing purposes
export { isElectron }
