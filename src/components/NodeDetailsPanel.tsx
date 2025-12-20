import React from 'react'
import type { PipelineGraph } from '../types/pipeline'

interface Props {
  nodeId: string
  graph: PipelineGraph | null
  onClose: () => void
}

export default function NodeDetailsPanel({ nodeId, graph, onClose }: Props) {
  const step = graph?.steps.find((s) => s.id === nodeId)
  if (!step) return (
    <div className="p-4">
      <button onClick={onClose}>Close</button>
      <p>Step not found</p>
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{step.name}</h3>
        <button onClick={onClose} className="text-gray-500">✕</button>
      </div>
      {step.description && <p className="text-sm text-gray-600 mt-2">{step.description}</p>}

      <div className="mt-4">
        <button className="px-3 py-2 bg-blue-600 text-white rounded">Execute</button>
      </div>
    </div>
  )
}
