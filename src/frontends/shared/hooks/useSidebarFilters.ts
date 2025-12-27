import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { PipelineGraph, PipelineStep } from '@aspire-pipeline-viewer/core'

export type StepGroup = {
  name: string
  isAggregator: boolean
  steps: PipelineStep[]
}

export type GroupVisibility = 'all' | 'some' | 'none'

export type UseSidebarFiltersOptions = {
  graph: PipelineGraph
  onVisibleStepsChange?: (visibleStepIds: Set<string> | undefined) => void
}

export type UseSidebarFiltersReturn = {
  // Filter state
  searchQuery: string
  setSearchQuery: (query: string) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  visibleSteps: Set<string>
  collapsedGroups: Set<string>
  
  // Computed data
  resources: string[]
  tags: string[]
  groupedSteps: StepGroup[]
  displayGroups: StepGroup[]
  hasHiddenSteps: boolean
  hasVisibleSteps: boolean
  
  // Actions
  toggleStepVisibility: (stepId: string, e: React.MouseEvent) => void
  toggleGroupVisibility: (group: StepGroup, e: React.MouseEvent) => void
  showOnlyGroup: (group: StepGroup, e: React.MouseEvent) => void
  toggleGroupCollapse: (groupName: string) => void
  getGroupVisibility: (group: StepGroup) => GroupVisibility
  filterByTag: (tag: string) => void
  showAll: () => void
  hideAll: () => void
}

export function useSidebarFilters({
  graph,
  onVisibleStepsChange,
}: UseSidebarFiltersOptions): UseSidebarFiltersReturn {
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
  const toggleGroupCollapse = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)
      return next
    })
  }, [])

  // Check group visibility state
  const getGroupVisibility = useCallback((group: StepGroup): GroupVisibility => {
    const groupStepIds = group.steps.map(s => s.id)
    const visibleCount = groupStepIds.filter(id => visibleSteps.has(id)).length
    if (visibleCount === groupStepIds.length) return 'all'
    if (visibleCount === 0) return 'none'
    return 'some'
  }, [visibleSteps])

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

  return {
    // Filter state
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    visibleSteps,
    collapsedGroups,
    
    // Computed data
    resources,
    tags,
    groupedSteps,
    displayGroups,
    hasHiddenSteps,
    hasVisibleSteps,
    
    // Actions
    toggleStepVisibility,
    toggleGroupVisibility,
    showOnlyGroup,
    toggleGroupCollapse,
    getGroupVisibility,
    filterByTag,
    showAll,
    hideAll,
  }
}
