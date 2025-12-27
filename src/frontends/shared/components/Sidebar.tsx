import React from 'react'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'
import { useSidebarFilters } from '../hooks/useSidebarFilters'
import '../styles/sidebar.css'

type SidebarProps = {
  graph: PipelineGraph
  selectedStepId?: string
  onSelectStep?: (id: string) => void
  onVisibleStepsChange?: (visibleStepIds: Set<string> | undefined) => void
  workspaceName?: string
  workspacePath?: string
  onOpenWorkspace?: () => void
}

export function Sidebar({ 
  graph, 
  selectedStepId, 
  onSelectStep, 
  onVisibleStepsChange,
  workspaceName, 
  workspacePath, 
  onOpenWorkspace 
}: SidebarProps) {
  const {
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    visibleSteps,
    collapsedGroups,
    tags,
    displayGroups,
    hasHiddenSteps,
    hasVisibleSteps,
    toggleStepVisibility,
    toggleGroupVisibility,
    showOnlyGroup,
    toggleGroupCollapse,
    getGroupVisibility,
    filterByTag,
    showAll,
    hideAll,
  } = useSidebarFilters({ graph, onVisibleStepsChange })

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
          Select AppHost Directory
        </button>
      </div>

      <div className="sidebar-header steps-header">
        <span>Steps</span>
        <div className="header-actions">
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
          >
            ⚙
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-section">
            <div className="filter-label">Quick Actions</div>
            <div className="filter-actions">
              <button 
                className="filter-action-btn"
                onClick={showAll}
                disabled={!hasHiddenSteps}
              >
                Show All
              </button>
              <button 
                className="filter-action-btn"
                onClick={hideAll}
                disabled={!hasVisibleSteps}
              >
                Hide All
              </button>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="filter-section">
              <div className="filter-label">Filter by Tag</div>
              <div className="filter-chips">
                {tags.map(tag => (
                  <button
                    key={tag}
                    className="filter-chip"
                    onClick={() => filterByTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-hint">
            Use checkboxes to show/hide individual steps or groups
          </div>
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Search steps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="step-list">
        {displayGroups.map(group => {
          const isCollapsed = collapsedGroups.has(group.name)
          const visibility = getGroupVisibility(group)
          
          return (
            <div key={group.name} className={`step-group ${visibility === 'none' ? 'hidden-group' : ''}`}>
              <div 
                className={`group-header ${group.isAggregator ? 'pipeline' : 'resource'}`}
                onClick={() => toggleGroupCollapse(group.name)}
              >
                <input
                  type="checkbox"
                  className="group-checkbox"
                  checked={visibility === 'all'}
                  ref={el => { if (el) el.indeterminate = visibility === 'some' }}
                  onChange={() => {}} // Handled by onClick
                  onClick={(e) => toggleGroupVisibility(group, e)}
                  title="Toggle group visibility"
                />
                <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                <span className="group-icon">{group.isAggregator ? '⬡' : '●'}</span>
                <span className="group-name">{group.name}</span>
                <span className="group-count">{group.steps.filter(s => visibleSteps.has(s.id)).length}/{group.steps.length}</span>
                <button 
                  className="group-filter-btn"
                  onClick={(e) => showOnlyGroup(group, e)}
                  title={`Show only ${group.name}`}
                >
                  ⊙
                </button>
              </div>
              {!isCollapsed && (
                <div className="group-steps">
                  {group.steps.map(step => {
                    const isVisible = visibleSteps.has(step.id)
                    return (
                      <div
                        key={step.id}
                        className={`step-item ${selectedStepId === step.id ? 'selected' : ''} ${!step.resource ? 'aggregator' : ''} ${!isVisible ? 'hidden-step' : ''}`}
                        data-step-id={step.id}
                        onClick={() => onSelectStep?.(step.id)}
                      >
                        <input
                          type="checkbox"
                          className="step-checkbox"
                          checked={isVisible}
                          onChange={() => {}} // Handled by onClick
                          onClick={(e) => toggleStepVisibility(step.id, e)}
                          title="Toggle step visibility"
                        />
                        <span className="step-icon">{step.resource ? '●' : '⬡'}</span>
                        <span className="step-name">{step.name}</span>
                        {step.tags && step.tags.length > 0 && (
                          <span className="step-tags-indicator" title={step.tags.join(', ')}>
                            🏷
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {displayGroups.length === 0 && (
          <div className="no-results">No steps match the search</div>
        )}
      </div>
    </div>
  )
}
