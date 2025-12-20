import React from 'react'
import type { PipelineGraph } from '../types/pipeline'

interface Props {
  graph: PipelineGraph | null
  onNodeSelected: (id: string) => void
}

export default function PipelineViewer({ graph, onNodeSelected }: Props) {
  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p>No pipeline loaded</p>
          <p className="text-sm">Select an AppHost directory to visualize its pipeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Placeholder: React Flow visualization will render here */}
      <div className="p-4">
        <h2 className="font-semibold mb-2">{graph.name ?? 'Pipeline'}</h2>
        <p className="text-sm text-gray-600">{graph.steps.length} steps</p>
      </div>
      <div className="p-4">
        <ul className="grid grid-cols-3 gap-2">
          {graph.steps.map((s) => (
            <li key={s.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => onNodeSelected(s.id)}>
              <div className="font-medium">{s.name}</div>
              {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
