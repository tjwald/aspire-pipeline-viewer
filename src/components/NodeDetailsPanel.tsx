import React, { useState } from 'react'
import type { PipelineGraph } from '../types/pipeline'

interface Props {
  nodeId: string
  graph: PipelineGraph | null
  directory: string | null
  onClose: () => void
  onExecute: () => void
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Running':
      return 'text-blue-600'
    case 'Success':
      return 'text-green-600'
    case 'Failed':
      return 'text-red-600'
    case 'Skipped':
      return 'text-gray-500'
    case 'Pending':
    default:
      return 'text-gray-400'
  }
}

export default function NodeDetailsPanel({ nodeId, graph, directory, onClose, onExecute }: Props) {
  const [isExecuting, setIsExecuting] = useState(false)
  const step = graph?.steps.find((s) => s.id === nodeId)
  
  if (!step) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <p className="text-sm text-gray-500">Step not found</p>
      </div>
    )
  }

  const dependentSteps = graph?.edges
    .filter((e) => e.target === nodeId)
    .map((e) => graph?.steps.find((s) => s.id === e.source)?.name)
    .filter(Boolean) ?? []

  const handleExecute = async () => {
    setIsExecuting(true)
    onExecute()
    try {
      // @ts-ignore
      await window.electronAPI?.runAspireDo?.(directory, step.id)
    } catch (err) {
      console.error('Failed to execute step:', err)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
          <div className={`text-xs font-medium mt-1 ${getStatusColor(step.status)}`}>{step.status}</div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-lg">✕</button>
      </div>

      <div className="border-t border-gray-200 pt-4 flex-1">
        {step.description && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Description</h4>
            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
          </div>
        )}

        {step.resource && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Resource</h4>
            <p className="text-sm text-gray-600 mt-1">{step.resource}</p>
          </div>
        )}

        {dependentSteps.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Dependencies</h4>
            <ul className="text-sm text-gray-600 mt-1 space-y-1">
              {dependentSteps.map((name) => (
                <li key={name} className="flex items-center">
                  <span className="text-blue-500 mr-2">←</span>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step.tags && step.tags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">Tags</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {step.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium text-sm transition-colors"
        >
          {isExecuting ? 'Executing...' : 'Execute Step'}
        </button>
      </div>
    </div>
  )
}
