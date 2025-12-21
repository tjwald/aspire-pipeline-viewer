import React, { useMemo, useState } from 'react'
import type { PipelineGraph } from '@aspire/core'
import '../styles/sidebar.css'

type SidebarProps = {
  graph: PipelineGraph
  selectedStepId?: string
  onSelectStep?: (id: string) => void
  workspaceName?: string
  workspacePath?: string
  onOpenWorkspace?: () => void
}

export function Sidebar({ graph, selectedStepId, onSelectStep, workspaceName, workspacePath, onOpenWorkspace }: SidebarProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return graph.steps.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
  }, [graph.steps, query])

  return (
    <div className="sidebar">
      <div className="sidebar-header">Workspace</div>
      <div className="workspace-section">
        <div className="workspace-label">Current Workspace</div>
        <div className="current-workspace" title={workspacePath || ''}>
          <div className="workspace-name">{workspaceName || 'Not selected'}</div>
          <div className="workspace-path">{workspacePath || ''}</div>
        </div>
        <button className="open-workspace-btn" onClick={onOpenWorkspace}>
          Open Workspace
        </button>
      </div>

      <div className="sidebar-header">Steps</div>
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Search steps..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="step-list">
        {filtered.map((step) => (
          <div
            key={step.id}
            className={`step-item ${selectedStepId === step.id ? 'selected' : ''}`}
            data-step-id={step.id}
            onClick={() => onSelectStep?.(step.id)}
          >
            <span className="step-status">{step.dependencies?.length ? '•' : '○'}</span>
            <span className="step-name">{step.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
