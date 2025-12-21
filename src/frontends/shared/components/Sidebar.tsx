import React, { useMemo, useState, useEffect, useCallback } from 'react'
import type { PipelineGraph, PipelineStep } from '@aspire/core'
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

// Group steps by resource (null resource = pipeline/aggregator step)
type StepGroup = {
  name: string
  isAggregator: boolean
  steps: PipelineStep[]
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
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
  // Track which steps are visible (checked) - default all visible
  const [visibleSteps, setVisibleSteps] = useState<Set<string>>(() => 
    new Set(graph.steps.map(s => s.id))
  )

  // Reset visible steps when graph changes AND notify parent
  useEffect(() => {
    const allSteps = new Set(graph.steps.map(s => s.id))
    setVisibleSteps(allSteps)
    // Notify parent immediately with all steps visible (undefined = no filtering)
    onVisibleStepsChange?.(undefined)
  }, [graph, onVisibleStepsChange])

  // Extract unique resources and tags
  const { resources, tags } = useMemo(() => {
    const resourceSet = new Set<string>()
    const tagSet = new Set<string>()
    
    graph.steps.forEach(step => {
      if (step.resource) resourceSet.add(step.resource)
      step.tags?.forEach(tag => tagSet.add(tag))
    })
    
    return {
      resources: Array.from(resourceSet).sort(),
      tags: Array.from(tagSet).sort()
    }
  }, [graph.steps])

  // Group steps by resource/pipeline
  const groupedSteps = useMemo((): StepGroup[] => {
    const pipelineSteps: PipelineStep[] = []
    const resourceMap = new Map<string, PipelineStep[]>()
    
    graph.steps.forEach(step => {
      if (!step.resource) {
        pipelineSteps.push(step)
      } else {
        const list = resourceMap.get(step.resource) || []
        list.push(step)
        resourceMap.set(step.resource, list)
      }
    })
    
    const groups: StepGroup[] = []
    
    // Pipeline/aggregator steps first
    if (pipelineSteps.length > 0) {
      groups.push({
        name: 'PIPELINE',
        isAggregator: true,
        steps: pipelineSteps.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
    
    // Resource groups
    resources.forEach(resource => {
      const steps = resourceMap.get(resource) || []
      if (steps.length > 0) {
        groups.push({
          name: resource,
          isAggregator: false,
          steps: steps.sort((a, b) => a.name.localeCompare(b.name)),
        })
      }
    })
    
    return groups
  }, [graph.steps, resources])

  // Filter groups by search query (for display only, doesn't affect visibility)
  const displayGroups = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return groupedSteps
    
    return groupedSteps
      .map(group => {
        const filteredSteps = group.steps.filter(step => 
          step.name.toLowerCase().includes(q) || step.id.toLowerCase().includes(q)
        )
        if (filteredSteps.length === 0) return null
        return { ...group, steps: filteredSteps }
      })
      .filter((g): g is StepGroup => g !== null)
  }, [groupedSteps, searchQuery])

  // Notify parent when visible steps change (only when filtering is active)
  useEffect(() => {
    // If all steps are visible, pass undefined to indicate no filtering
    if (visibleSteps.size === graph.steps.length) {
      onVisibleStepsChange?.(undefined)
    } else {
      onVisibleStepsChange?.(visibleSteps)
    }
  }, [visibleSteps, graph.steps.length, onVisibleStepsChange])

  // Toggle a single step's visibility
  const toggleStepVisibility = useCallback((stepId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setVisibleSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }, [])

  // Toggle entire group visibility
  const toggleGroupVisibility = useCallback((group: StepGroup, e: React.MouseEvent) => {
    e.stopPropagation()
    const groupStepIds = group.steps.map(s => s.id)
    const allVisible = groupStepIds.every(id => visibleSteps.has(id))
    
    setVisibleSteps(prev => {
      const next = new Set(prev)
      if (allVisible) {
        // Hide all steps in group
        groupStepIds.forEach(id => next.delete(id))
      } else {
        // Show all steps in group
        groupStepIds.forEach(id => next.add(id))
      }
      return next
    })
  }, [visibleSteps])

  // Show ONLY this group (hide everything else)
  const showOnlyGroup = useCallback((group: StepGroup, e: React.MouseEvent) => {
    e.stopPropagation()
    const groupStepIds = new Set(group.steps.map(s => s.id))
    setVisibleSteps(groupStepIds)
  }, [])

  // Toggle group collapse
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)
      return next
    })
  }

  // Check group visibility state
  const getGroupVisibility = (group: StepGroup): 'all' | 'some' | 'none' => {
    const groupStepIds = group.steps.map(s => s.id)
    const visibleCount = groupStepIds.filter(id => visibleSteps.has(id)).length
    if (visibleCount === groupStepIds.length) return 'all'
    if (visibleCount === 0) return 'none'
    return 'some'
  }

  // Filter by tags
  const filterByTag = useCallback((tag: string) => {
    const stepsWithTag = graph.steps.filter(s => s.tags?.includes(tag))
    setVisibleSteps(new Set(stepsWithTag.map(s => s.id)))
  }, [graph.steps])

  // Show all steps
  const showAll = useCallback(() => {
    setVisibleSteps(new Set(graph.steps.map(s => s.id)))
  }, [graph.steps])

  // Hide all steps
  const hideAll = useCallback(() => {
    setVisibleSteps(new Set())
  }, [])

  const hasHiddenSteps = visibleSteps.size < graph.steps.length
  const hasVisibleSteps = visibleSteps.size > 0

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
