import React from 'react'
import type { PipelineGraph, PipelineStep } from '@aspire-pipeline-viewer/core'
import '../styles/details.css'

type DetailsPanelProps = {
  graph: PipelineGraph
  selectedStepId?: string
  onRunStep?: (stepId: string) => void
}

export function DetailsPanel({ graph, selectedStepId, onRunStep }: DetailsPanelProps) {
  const step: PipelineStep | undefined = graph.steps.find((s) => s.id === selectedStepId)
  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined

  if (!step) {
    return (
      <div className="details-panel">
        <div className="details-header">Pipeline Details</div>
        <div className="details-content">
          <div className="no-selection">Select a step to view details</div>
        </div>
      </div>
    )
  }

  return (
    <div className="details-panel">
      <div className="details-header">
        <span>Step Details</span>
        {isElectron && onRunStep && (
          <button
            className="run-step-btn"
            onClick={() => onRunStep(step.id)}
            title="Run this step"
            data-testid="run-step-btn"
          >
            ▶️ Run
          </button>
        )}
      </div>
      <div className="details-content">
        <div className="detail-section">
          <div className="detail-label">Name</div>
          <div className="detail-value" style={{ fontWeight: 500 }}>{step.name}</div>
        </div>
        {step.description && (
          <div className="detail-section">
            <div className="detail-label">Description</div>
            <div className="detail-value">{step.description}</div>
          </div>
        )}
        {step.dependencies && step.dependencies.length > 0 && (
          <div className="detail-section">
            <div className="detail-label">Dependencies</div>
            <ul className="detail-list">
              {step.dependencies.map((dep) => (
                <li key={dep} className="detail-list-item">
                  {dep}
                </li>
              ))}
            </ul>
          </div>
        )}
        {step.resource && (
          <div className="detail-section">
            <div className="detail-label">Resource</div>
            <div className="detail-value">{step.resource}</div>
          </div>
        )}
        {step.tags && step.tags.length > 0 && (
          <div className="detail-section">
            <div className="detail-label">Tags</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {step.tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .run-step-btn {
          padding: 4px 12px;
          background: #0e639c;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .run-step-btn:hover {
          background: #1177bb;
        }
      `}</style>
    </div>
  )
}
