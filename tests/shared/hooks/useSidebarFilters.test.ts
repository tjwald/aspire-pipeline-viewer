import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarFilters } from '../../../src/frontends/shared/hooks/useSidebarFilters'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

const createTestGraph = (): PipelineGraph => ({
  id: 'test',
  name: 'Test',
  steps: [
    { id: 'step-1', name: 'Step 1', resource: 'app (Container)', tags: ['build'] },
    { id: 'step-2', name: 'Step 2', resource: 'app (Container)', tags: ['deploy'] },
    { id: 'step-3', name: 'Step 3', resource: 'db (Database)', tags: ['deploy'] },
    { id: 'agg-1', name: 'Aggregator', resource: undefined, tags: [] },
  ],
  edges: [],
})

describe('useSidebarFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts with all steps visible', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      expect(result.current.visibleSteps.size).toBe(4)
      expect(result.current.hasHiddenSteps).toBe(false)
      expect(result.current.hasVisibleSteps).toBe(true)
    })

    it('extracts resources from graph', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      expect(result.current.resources).toContain('app (Container)')
      expect(result.current.resources).toContain('db (Database)')
    })

    it('extracts tags from graph', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      expect(result.current.tags).toContain('build')
      expect(result.current.tags).toContain('deploy')
    })

    it('groups steps by resource', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const pipelineGroup = result.current.groupedSteps.find(g => g.name === 'PIPELINE')
      expect(pipelineGroup).toBeDefined()
      expect(pipelineGroup?.isAggregator).toBe(true)
      
      const appGroup = result.current.groupedSteps.find(g => g.name === 'app (Container)')
      expect(appGroup).toBeDefined()
      expect(appGroup?.steps.length).toBe(2)
    })
  })

  describe('search filtering', () => {
    it('filters displayGroups by search query', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.setSearchQuery('Step 1')
      })
      
      const allSteps = result.current.displayGroups.flatMap(g => g.steps)
      expect(allSteps.some(s => s.name === 'Step 1')).toBe(true)
      expect(allSteps.some(s => s.name === 'Step 2')).toBe(false)
    })

    it('searches by step id', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.setSearchQuery('step-3')
      })
      
      const allSteps = result.current.displayGroups.flatMap(g => g.steps)
      expect(allSteps.length).toBe(1)
      expect(allSteps[0].id).toBe('step-3')
    })
  })

  describe('visibility actions', () => {
    it('toggleStepVisibility hides visible step', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      
      act(() => {
        result.current.toggleStepVisibility('step-1', mockEvent)
      })
      
      expect(result.current.visibleSteps.has('step-1')).toBe(false)
      expect(result.current.hasHiddenSteps).toBe(true)
    })

    it('toggleStepVisibility shows hidden step', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      
      // First hide
      act(() => {
        result.current.toggleStepVisibility('step-1', mockEvent)
      })
      
      // Then show
      act(() => {
        result.current.toggleStepVisibility('step-1', mockEvent)
      })
      
      expect(result.current.visibleSteps.has('step-1')).toBe(true)
    })

    it('toggleGroupVisibility hides all steps in group', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      const appGroup = result.current.groupedSteps.find(g => g.name === 'app (Container)')!
      
      act(() => {
        result.current.toggleGroupVisibility(appGroup, mockEvent)
      })
      
      expect(result.current.visibleSteps.has('step-1')).toBe(false)
      expect(result.current.visibleSteps.has('step-2')).toBe(false)
    })

    it('showOnlyGroup shows only that group', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      const dbGroup = result.current.groupedSteps.find(g => g.name === 'db (Database)')!
      
      act(() => {
        result.current.showOnlyGroup(dbGroup, mockEvent)
      })
      
      expect(result.current.visibleSteps.size).toBe(1)
      expect(result.current.visibleSteps.has('step-3')).toBe(true)
    })

    it('showAll makes all steps visible', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      // First hide some
      act(() => {
        result.current.hideAll()
      })
      
      expect(result.current.visibleSteps.size).toBe(0)
      
      act(() => {
        result.current.showAll()
      })
      
      expect(result.current.visibleSteps.size).toBe(4)
    })

    it('hideAll hides all steps', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.hideAll()
      })
      
      expect(result.current.visibleSteps.size).toBe(0)
      expect(result.current.hasVisibleSteps).toBe(false)
    })

    it('filterByTag shows only steps with tag', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.filterByTag('build')
      })
      
      expect(result.current.visibleSteps.size).toBe(1)
      expect(result.current.visibleSteps.has('step-1')).toBe(true)
    })
  })

  describe('group collapse', () => {
    it('toggleGroupCollapse adds group to collapsed set', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.toggleGroupCollapse('app (Container)')
      })
      
      expect(result.current.collapsedGroups.has('app (Container)')).toBe(true)
    })

    it('toggleGroupCollapse removes group from collapsed set', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      act(() => {
        result.current.toggleGroupCollapse('app (Container)')
      })
      
      act(() => {
        result.current.toggleGroupCollapse('app (Container)')
      })
      
      expect(result.current.collapsedGroups.has('app (Container)')).toBe(false)
    })
  })

  describe('getGroupVisibility', () => {
    it('returns "all" when all steps visible', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const appGroup = result.current.groupedSteps.find(g => g.name === 'app (Container)')!
      expect(result.current.getGroupVisibility(appGroup)).toBe('all')
    })

    it('returns "none" when no steps visible', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      const appGroup = result.current.groupedSteps.find(g => g.name === 'app (Container)')!
      
      act(() => {
        result.current.toggleGroupVisibility(appGroup, mockEvent)
      })
      
      expect(result.current.getGroupVisibility(appGroup)).toBe('none')
    })

    it('returns "some" when partially visible', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      
      act(() => {
        result.current.toggleStepVisibility('step-1', mockEvent)
      })
      
      const appGroup = result.current.groupedSteps.find(g => g.name === 'app (Container)')!
      expect(result.current.getGroupVisibility(appGroup)).toBe('some')
    })
  })

  describe('callback notifications', () => {
    it('calls onVisibleStepsChange when visibility changes', () => {
      const graph = createTestGraph()
      const onVisibleStepsChange = vi.fn()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph, onVisibleStepsChange })
      )
      
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent
      
      act(() => {
        result.current.toggleStepVisibility('step-1', mockEvent)
      })
      
      // Should have been called with the new Set
      expect(onVisibleStepsChange).toHaveBeenCalled()
    })

    it('calls onVisibleStepsChange with undefined when all steps visible', () => {
      const graph = createTestGraph()
      const onVisibleStepsChange = vi.fn()
      
      renderHook(() => 
        useSidebarFilters({ graph, onVisibleStepsChange })
      )
      
      // Initial call should be with undefined (all visible = no filtering)
      expect(onVisibleStepsChange).toHaveBeenCalledWith(undefined)
    })
  })

  describe('filter panel', () => {
    it('toggles showFilters state', () => {
      const graph = createTestGraph()
      const { result } = renderHook(() => 
        useSidebarFilters({ graph })
      )
      
      expect(result.current.showFilters).toBe(false)
      
      act(() => {
        result.current.setShowFilters(true)
      })
      
      expect(result.current.showFilters).toBe(true)
    })
  })
})
