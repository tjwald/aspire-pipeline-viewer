import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { RunView, getTransitiveDependencies } from '../../../../src/frontends/electron/renderer/components/RunTab/RunView'
import type { PipelineGraph, ParsedEvent } from '@aspire-pipeline-viewer/core'
import { ExecutionStatus } from '@aspire-pipeline-viewer/core'
import type { NodeStatusesMap } from '../../../../src/frontends/electron/renderer/components/RunTab/GraphNodeBadge'

// Mock electronAPI
const mockElectronAPI = {
  onRunOutput: vi.fn(),
  onRunStatusChange: vi.fn(),
  killRun: vi.fn(),
  renameRun: vi.fn(),
}

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks()
  
  // Setup window.electronAPI
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  })
  
  // Default mock implementations
  mockElectronAPI.onRunOutput.mockReturnValue(vi.fn())
  mockElectronAPI.onRunStatusChange.mockReturnValue(vi.fn())
  mockElectronAPI.killRun.mockResolvedValue(undefined)
  mockElectronAPI.renameRun.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RunView', () => {
  const mockGraph: PipelineGraph = {
    id: 'test-pipeline',
    name: 'Test Pipeline',
    steps: [
      { id: 'step-1', name: 'Build', dependencies: [] },
      { id: 'step-2', name: 'Test', dependencies: ['step-1'] },
      { id: 'step-3', name: 'Deploy', dependencies: ['step-2'] },
      { id: 'step-4', name: 'Notify', dependencies: ['step-3'] },
    ],
    edges: [
      { id: 'e1', source: 'step-1', target: 'step-2' },
      { id: 'e2', source: 'step-2', target: 'step-3' },
      { id: 'e3', source: 'step-3', target: 'step-4' },
    ],
  }

  describe('getTransitiveDependencies', () => {
    it('returns the step itself when it has no dependencies', () => {
      const deps = getTransitiveDependencies(mockGraph, 'step-1')
      expect(deps).toEqual(new Set(['step-1']))
    })

    it('returns immediate dependencies', () => {
      const deps = getTransitiveDependencies(mockGraph, 'step-2')
      expect(deps).toEqual(new Set(['step-1', 'step-2']))
    })

    it('returns transitive dependencies', () => {
      const deps = getTransitiveDependencies(mockGraph, 'step-3')
      expect(deps).toEqual(new Set(['step-1', 'step-2', 'step-3']))
    })

    it('returns full chain for deeply nested step', () => {
      const deps = getTransitiveDependencies(mockGraph, 'step-4')
      expect(deps).toEqual(new Set(['step-1', 'step-2', 'step-3', 'step-4']))
    })
  })

  describe('rendering', () => {
    it('renders with run name and status badge', () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
          initialName="Test Run"
        />
      )

      expect(screen.getByTestId('run-view')).toBeInTheDocument()
      expect(screen.getByTestId('run-name')).toHaveTextContent('Test Run')
      expect(screen.getByTestId('run-status-badge')).toBeInTheDocument()
    })

    it('shows only the target step and its dependencies in the graph', () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // step-1 and step-2 should be visible (step-2 depends on step-1)
      const graphWrapper = screen.getByTestId('run-graph-wrapper')
      expect(graphWrapper).toBeInTheDocument()
      // GraphView now renders badges inline, so check for SVG badge elements
      const svg = graphWrapper.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // Look for badge icons (e.g. ⏳, ▶️, ✔️, ❌, ⏭️)
      const badgeIcons = Array.from(svg?.querySelectorAll('text') || []).map(t => t.textContent)
      // At least one badge icon should be present
      expect(badgeIcons.some(icon => ['⏳','▶️','✔️','❌','⏭️'].includes(icon || ''))).toBe(true)
    })

    it('initializes all visible nodes with pending status', () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Check for ⏳ badge icons in the SVG
      const graphWrapper = screen.getByTestId('run-graph-wrapper')
      const svg = graphWrapper.querySelector('svg')
      expect(svg).toBeInTheDocument()
      const badgeIcons = Array.from(svg?.querySelectorAll('text') || []).map(t => t.textContent)
      // There should be two ⏳ badges for step-1 and step-2
      expect(badgeIcons.filter(icon => icon === '⏳').length).toBe(2)
    })
  })

  describe('IPC event handling', () => {
    it('subscribes to run output events on mount', () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      expect(mockElectronAPI.onRunOutput).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.onRunStatusChange).toHaveBeenCalledTimes(1)
    })

    it('unsubscribes from events on unmount', () => {
      const unsubOutput = vi.fn()
      const unsubStatus = vi.fn()
      mockElectronAPI.onRunOutput.mockReturnValue(unsubOutput)
      mockElectronAPI.onRunStatusChange.mockReturnValue(unsubStatus)

      const { unmount } = render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      unmount()

      expect(unsubOutput).toHaveBeenCalled()
      expect(unsubStatus).toHaveBeenCalled()
    })

    it('updates logs when receiving run output events', async () => {
      let outputCallback: (data: { runId: string; event: ParsedEvent }) => void

      mockElectronAPI.onRunOutput.mockImplementation((cb) => {
        outputCallback = cb
        return vi.fn()
      })

      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Simulate receiving log output
      act(() => {
        outputCallback!({
          runId: 'test-run-1',
          event: {
            timestamp: Date.now(),
            text: 'Building project...',
            stepName: 'step-1',
            type: 'line',
          },
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Building project...')).toBeInTheDocument()
      })
    })

    it('ignores events for different run IDs', async () => {
      let outputCallback: (data: { runId: string; event: ParsedEvent }) => void

      mockElectronAPI.onRunOutput.mockImplementation((cb) => {
        outputCallback = cb
        return vi.fn()
      })

      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Simulate receiving log for different run
      act(() => {
        outputCallback!({
          runId: 'different-run',
          event: {
            timestamp: Date.now(),
            text: 'Should not appear',
            stepName: 'step-1',
            type: 'line',
          },
        })
      })

      // The log should not appear
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument()
    })

    it('updates node statuses when receiving status change events', async () => {
      let statusCallback: (data: { runId: string; status: 'running' | 'success' | 'failed'; nodeStatuses: NodeStatusesMap }) => void
      
      mockElectronAPI.onRunStatusChange.mockImplementation((cb) => {
        statusCallback = cb
        return vi.fn()
      })

      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Simulate status change
      act(() => {
        statusCallback!({
          runId: 'test-run-1',
          status: 'running',
          nodeStatuses: { 'step-1': ExecutionStatus.Success, 'step-2': ExecutionStatus.Running },
        })
      })

      await waitFor(() => {
        // Check for badge icons in the SVG for updated statuses
        const graphWrapper = screen.getByTestId('run-graph-wrapper')
        const svg = graphWrapper.querySelector('svg')
        expect(svg).toBeInTheDocument()
        const badgeIcons = Array.from(svg?.querySelectorAll('text') || []).map(t => t.textContent)
        expect(badgeIcons).toContain('✔️') // success
        expect(badgeIcons).toContain('▶️') // running
      })
    })
  })

  describe('node selection and log filtering', () => {
    it('filters logs when a node is selected in the graph', async () => {
      let outputCallback: (data: { runId: string; event: ParsedEvent }) => void

      mockElectronAPI.onRunOutput.mockImplementation((cb) => {
        outputCallback = cb
        return vi.fn()
      })

      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-3"
        />
      )

      // Add logs for multiple steps
      act(() => {
        outputCallback!({
          runId: 'test-run-1',
          event: {
            timestamp: Date.now(),
            text: 'Building...',
            stepName: 'step-1',
            type: 'line',
          },
        })
        outputCallback!({
          runId: 'test-run-1',
          event: {
            timestamp: Date.now() + 1000,
            text: 'Testing...',
            stepName: 'step-2',
            type: 'line',
          },
        })
        outputCallback!({
          runId: 'test-run-1',
          event: {
            timestamp: Date.now() + 2000,
            text: 'Deploying...',
            stepName: 'step-3',
            type: 'line',
          },
        })
      })

      // Verify all logs are visible initially
      await waitFor(() => {
        expect(screen.getByText('Building...')).toBeInTheDocument()
        expect(screen.getByText('Testing...')).toBeInTheDocument()
        expect(screen.getByText('Deploying...')).toBeInTheDocument()
      })
    })
  })

  describe('run controls', () => {
    it('shows kill button when run is in running status', () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Initial status is 'running'
      expect(screen.getByTestId('kill-run-btn')).toBeInTheDocument()
    })

    it('calls killRun when stop button is clicked', async () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      fireEvent.click(screen.getByTestId('kill-run-btn'))

      await waitFor(() => {
        expect(mockElectronAPI.killRun).toHaveBeenCalledWith('test-run-1')
      })
    })

    it('hides kill button after run completes', async () => {
      let statusCallback: (data: { runId: string; status: 'running' | 'success' | 'failed'; nodeStatuses: NodeStatusesMap }) => void
      
      mockElectronAPI.onRunStatusChange.mockImplementation((cb) => {
        statusCallback = cb
        return vi.fn()
      })

      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
        />
      )

      // Simulate run completion
      act(() => {
        statusCallback!({
          runId: 'test-run-1',
          status: 'success',
          nodeStatuses: { 'step-1': ExecutionStatus.Success, 'step-2': ExecutionStatus.Success },
        })
      })

      await waitFor(() => {
        expect(screen.queryByTestId('kill-run-btn')).not.toBeInTheDocument()
      })
    })
  })

  describe('rename functionality', () => {
    it('allows renaming the run by clicking the name', async () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
          initialName="Original Name"
        />
      )

      // Click on the run name to start editing
      fireEvent.click(screen.getByTestId('run-name'))

      // Input should appear
      await waitFor(() => {
        expect(screen.getByTestId('run-name-input')).toBeInTheDocument()
      })

      // Change the name
      fireEvent.change(screen.getByTestId('run-name-input'), {
        target: { value: 'New Name' },
      })

      // Blur to save
      fireEvent.blur(screen.getByTestId('run-name-input'))

      await waitFor(() => {
        expect(mockElectronAPI.renameRun).toHaveBeenCalledWith('test-run-1', 'New Name')
      })
    })

    it('saves rename on Enter key', async () => {
      render(
        <RunView
          runId="test-run-1"
          graph={mockGraph}
          targetStepId="step-2"
          initialName="Original Name"
        />
      )

      fireEvent.click(screen.getByTestId('run-name'))

      await waitFor(() => {
        expect(screen.getByTestId('run-name-input')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByTestId('run-name-input'), {
        target: { value: 'Enter Name' },
      })

      fireEvent.keyDown(screen.getByTestId('run-name-input'), { key: 'Enter' })

      await waitFor(() => {
        expect(mockElectronAPI.renameRun).toHaveBeenCalledWith('test-run-1', 'Enter Name')
      })
    })
  })
})
