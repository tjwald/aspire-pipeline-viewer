import React from 'react'
import type { PipelineGraph, PipelineStep } from '@aspire-pipeline-viewer/core'
import '../styles/details.css'

type DetailsPanelProps = {
  graph: PipelineGraph
  selectedStepId?: string
}

export function DetailsPanel({ graph, selectedStepId }: DetailsPanelProps) {
  const step: PipelineStep | undefined = graph.steps.find((s) => s.id === selectedStepId)

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
      <div className="details-header">Step Details</div>
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
    </div>
  )
}
