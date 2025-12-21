import React, { useState, useEffect } from 'react'
import AppHostSelector from './components/AppHostSelector'
import PipelineViewer from './components/PipelineViewer'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import ExecutionPanel from './components/ExecutionPanel'
import Toast from './components/Toast'
import { useToast } from './hooks'
import { TIMEOUTS } from './constants'
import type { PipelineGraph } from '@/core'

export default function App() {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null)
  const [pipelineGraph, setPipelineGraph] = useState<PipelineGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showExecutionPanel, setShowExecutionPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    if (!selectedDirectory) return

    setIsLoading(true)
    ;(async () => {
      try {
        // @ts-ignore
        const result = await window.electronAPI?.getApphostDiagnostics?.(selectedDirectory)
        if (result?.output) {
          const { parseDiagnostics } = await import('@/core')
          const graph = parseDiagnostics(result.output)
          setPipelineGraph(graph)
          showToast(`Loaded pipeline with ${graph.steps.length} steps`, 'success', TIMEOUTS.TOAST_DURATION_SHORT)
        } else {
          showToast('Failed to load diagnostics - no output received', 'error')
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Failed to load diagnostics:', err)
        showToast(`Failed to load diagnostics: ${errorMsg}`, 'error')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [selectedDirectory, showToast])

  const handleDirectorySelected = (directory: string) => {
    setSelectedDirectory(directory)
    showToast(`Loading pipeline from ${directory}...`, 'info')
  }

  const handleReset = () => {
    setSelectedDirectory(null)
    setPipelineGraph(null)
    setSelectedNodeId(null)
  }

  if (!selectedDirectory) {
    return <AppHostSelector onDirectorySelected={handleDirectorySelected} />
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <header className="border-b border-gray-200 bg-white px-4 py-3 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">{selectedDirectory}</h1>
              {isLoading && <p className="text-xs text-gray-500 mt-1">Loading diagnostics...</p>}
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              Change Directory
            </button>
          </header>

          <div className="flex-1 overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin text-2xl">⟳</div>
                  <p className="mt-2 text-gray-600 text-sm">Loading pipeline...</p>
                </div>
              </div>
            )}
            <PipelineViewer
              graph={pipelineGraph}
              selectedNodeId={selectedNodeId}
              onNodeSelected={setSelectedNodeId}
            />
          </div>
        </div>

        {selectedNodeId && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <NodeDetailsPanel
              nodeId={selectedNodeId}
              graph={pipelineGraph}
              directory={selectedDirectory}
              onClose={() => setSelectedNodeId(null)}
              onExecute={() => setShowExecutionPanel(true)}
            />
          </aside>
        )}
      </div>

      <ExecutionPanel isVisible={showExecutionPanel} onClose={() => setShowExecutionPanel(false)} />

      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
