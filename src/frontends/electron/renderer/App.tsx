import React, { useState, useCallback } from 'react'
import { Sidebar } from '../../shared/components/Sidebar'
import { GraphView } from '../../shared/components/GraphView'
import { DetailsPanel } from '../../shared/components/DetailsPanel'
import { ErrorBoundary } from '../../shared/components/ErrorBoundary'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'
import '../../shared/styles/base.css'
import '../../shared/styles/sidebar.css'
import '../../shared/styles/graph.css'
import '../../shared/styles/details.css'
import '../../shared/styles/toolbar.css'

export default function App() {
  const [graph, setGraph] = useState<PipelineGraph | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>()
  const [workspaceName, setWorkspaceName] = useState<string | undefined>()
  const [workspacePath, setWorkspacePath] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleStepIds, setVisibleStepIds] = useState<Set<string> | undefined>()

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
      <ErrorBoundary section="Graph View">
        <GraphView
          graph={graph}
          selectedStepId={selectedStepId}
          onSelectStep={setSelectedStepId}
          visibleStepIds={visibleStepIds}
        />
      </ErrorBoundary>
      <ErrorBoundary section="Details Panel">
        <DetailsPanel graph={graph} selectedStepId={selectedStepId} />
      </ErrorBoundary>
    </div>
  )
}
