import React, { useState, useEffect } from 'react'
import AppHostSelector from './components/AppHostSelector'
import PipelineViewer from './components/PipelineViewer'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import { parseDiagnostics } from './utils/diagnosticsParser'
import type { PipelineGraph } from './types/pipeline'

export default function App() {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null)
  const [pipelineGraph, setPipelineGraph] = useState<PipelineGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDirectory) return
    ;(async () => {
      try {
        // @ts-ignore
        const result = await window.electronAPI?.getApphostDiagnostics?.(selectedDirectory)
        if (result?.output) {
          const graph = parseDiagnostics(result.output)
          setPipelineGraph(graph)
        }
      } catch (err) {
        console.error('Failed to load diagnostics:', err)
      }
    })()
  }, [selectedDirectory])

  const handleDirectorySelected = (directory: string) => {
    setSelectedDirectory(directory)
  }

  const handleNodeSelected = (nodeId: string) => setSelectedNodeId(nodeId)
  const handleResetDirectory = () => {
    setSelectedDirectory(null)
    setPipelineGraph(null)
    setSelectedNodeId(null)
  }

  if (!selectedDirectory) {
    return <AppHostSelector onDirectorySelected={handleDirectorySelected} />
  }

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">{selectedDirectory}</h1>
          <button onClick={handleResetDirectory} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">
            Change Directory
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PipelineViewer graph={pipelineGraph} selectedNodeId={selectedNodeId} onNodeSelected={handleNodeSelected} />
        </div>
      </div>
      {selectedNodeId && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <NodeDetailsPanel nodeId={selectedNodeId} graph={pipelineGraph} onClose={() => setSelectedNodeId(null)} />
        </div>
      )}
    </div>
  )
}
