import React, { useState } from 'react'
import AppHostSelector from './components/AppHostSelector'
import PipelineViewer from './components/PipelineViewer'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import type { PipelineGraph } from './types/pipeline'

export default function App() {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null)
  const [pipelineGraph, _setPipelineGraph] = useState<PipelineGraph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const handleDirectorySelected = (directory: string) => {
    setSelectedDirectory(directory)
    // TODO: load diagnostics via IPC
  }

  const handleNodeSelected = (nodeId: string) => setSelectedNodeId(nodeId)

  if (!selectedDirectory) {
    return <AppHostSelector onDirectorySelected={handleDirectorySelected} />
  }

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">{selectedDirectory}</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <PipelineViewer graph={pipelineGraph} onNodeSelected={handleNodeSelected} />
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
