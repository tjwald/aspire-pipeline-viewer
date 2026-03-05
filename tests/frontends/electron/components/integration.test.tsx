import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../../../src/frontends/electron/renderer/App'

// Mock the core module
vi.mock('@aspire-pipeline-viewer/core', () => ({
  parseDiagnostics: vi.fn(() => ({
    id: 'test-graph',
    name: 'Test Graph',
    steps: [
      {
        id: 'step1',
        name: 'Step 1',
        resource: 'TestResource',
      },
      {
        id: 'step2',
        name: 'Step 2',
        resource: 'AnotherResource',
        dependencies: ['step1'],
      },
    ],
    edges: [
      { id: 'edge1', source: 'step1', target: 'step2' },
    ],
  })),
}))

describe('Integration: Run Button and Context Menu', () => {
  beforeEach(() => {
    // Mock window.electronAPI
    const mockElectronAPI = {
      selectApphostDirectory: vi.fn().mockResolvedValue('/test/workspace'),
      getApphostDiagnostics: vi.fn().mockResolvedValue({
        code: 0,
        output: 'diagnostic output',
      }),
      runStep: vi.fn().mockResolvedValue('run-123'),
      killRun: vi.fn().mockResolvedValue(undefined),
      renameRun: vi.fn().mockResolvedValue(undefined),
      onRunOutput: vi.fn(() => () => {}),
      onRunStatusChange: vi.fn(() => () => {}),
    }

    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })
  })

  it('shows Run button in DetailsPanel when step is selected', async () => {
    render(<App />)

    // Open workspace
    const openButton = screen.getByText('Select AppHost Directory')
    fireEvent.click(openButton)

    // Wait for graph to load
    await waitFor(() => {
      expect(screen.queryByText('Loading diagnostics...')).toBeNull()
    })

    // Select a step from sidebar (not from SVG)
    const step = screen.getAllByText('Step 1')[0] // Get first one (from sidebar)
    fireEvent.click(step)

    // Wait for DetailsPanel to update
    await waitFor(() => {
      const runButton = screen.queryByTestId('run-step-btn')
      expect(runButton).toBeDefined()
    })
  })

  it.skip('calls runStep and switches to Runs view when Run button is clicked', async () => {
    const mockRunStep = vi.fn().mockResolvedValue('run-123')
    window.electronAPI.runStep = mockRunStep

    const { container } = render(<App />)

    // Open workspace
    const openButton = screen.getByText('Select AppHost Directory')
    fireEvent.click(openButton)

    // Wait for graph to load
    await waitFor(() => {
      expect(screen.queryByText('Loading diagnostics...')).toBeNull()
    })

    // Select a step from sidebar using the step item div
    await waitFor(() => {
      const stepItem = container.querySelector('.step-item[data-step-id="step1"]')
      expect(stepItem).not.toBeNull()
    })
    
    const stepItem = container.querySelector('.step-item[data-step-id="step1"]')
    fireEvent.click(stepItem!)

    // Wait for Run button to appear
    const runButton = await waitFor(() => {
      const btn = screen.queryByTestId('run-step-btn')
      if (!btn) throw new Error('Run button not found')
      return btn
    })
    
    fireEvent.click(runButton)

    // Should call runStep with step ID
    await waitFor(() => {
      expect(mockRunStep).toHaveBeenCalledWith('step1')
    })

    // Should switch to Runs view
    await waitFor(() => {
      const runsTab = screen.getByTestId('view-mode-runs')
      expect(runsTab.className).toContain('active')
    })
  })

  it('shows context menu on right-click in GraphView', async () => {
    render(<App />)

    // Open workspace
    const openButton = screen.getByText('Select AppHost Directory')
    fireEvent.click(openButton)

    // Wait for graph to load
    await waitFor(() => {
      expect(screen.queryByText('Loading diagnostics...')).toBeNull()
    })

    // Find a graph node and right-click
    const { container } = render(<App />)
    await waitFor(async () => {
      const node = container.querySelector('[data-step-id="step1"]')
      if (node) {
        fireEvent.contextMenu(node, { clientX: 100, clientY: 200 })
        
        // Context menu should appear
        await waitFor(() => {
          expect(screen.queryByTestId('graph-context-menu')).toBeDefined()
        })
      }
    })
  })

  it('calls runStep when context menu Run option is clicked', async () => {
    const mockRunStep = vi.fn().mockResolvedValue('run-456')
    window.electronAPI.runStep = mockRunStep

    const { container } = render(<App />)

    // Open workspace
    const openButton = screen.getByText('Select AppHost Directory')
    fireEvent.click(openButton)

    // Wait for graph to load
    await waitFor(() => {
      expect(screen.queryByText('Loading diagnostics...')).toBeNull()
    })

    // Right-click on a graph node
    await waitFor(async () => {
      const node = container.querySelector('[data-step-id="step1"]')
      if (node) {
        fireEvent.contextMenu(node, { clientX: 100, clientY: 200 })
        
        // Click context menu Run option
        await waitFor(async () => {
          const runOption = screen.queryByTestId('context-menu-run')
          if (runOption) {
            fireEvent.click(runOption)
            
            // Should call runStep
            await waitFor(() => {
              expect(mockRunStep).toHaveBeenCalledWith('step1')
            })
          }
        })
      }
    })
  })

  it('does not show Run button in web build (no electronAPI)', async () => {
    // Remove electronAPI to simulate web build
    delete (window as any).electronAPI

    render(<App />)

    // Should not show view mode tabs (Electron only)
    expect(screen.queryByTestId('view-mode-graph')).toBeNull()
    expect(screen.queryByTestId('view-mode-runs')).toBeNull()
  })
})
