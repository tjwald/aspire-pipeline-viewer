import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraphView } from '../../../src/frontends/shared/components/GraphView'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

const mockGraph: PipelineGraph = {
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
}

describe('GraphView', () => {
  it('renders graph with steps', () => {
    render(<GraphView graph={mockGraph} />)
    
    // Zoom controls should be present
    expect(screen.getByTitle('Zoom In')).toBeDefined()
    expect(screen.getByTitle('Zoom Out')).toBeDefined()
    expect(screen.getByTitle('Reset Zoom')).toBeDefined()
  })

  it('calls onSelectStep when a step is clicked', () => {
    const onSelectStep = vi.fn()
    const { container } = render(
      <GraphView
        graph={mockGraph}
        onSelectStep={onSelectStep}
      />
    )
    
    // Find a graph node by data attribute (SVG element)
    const node = container.querySelector('g[data-step-id="step1"] rect')
    expect(node).toBeDefined()
    
    if (node) {
      fireEvent.click(node)
      expect(onSelectStep).toHaveBeenCalledWith('step1')
    }
  })

  it('does NOT show context menu when not in Electron environment', () => {
    // Ensure window.electronAPI is undefined
    delete (window as any).electronAPI

    const onRunStep = vi.fn()
    const { container } = render(
      <GraphView 
        graph={mockGraph}
        onRunStep={onRunStep}
      />
    )

    // Find a graph node and right-click
    const node = container.querySelector('[data-step-id="step1"]')
    if (node) {
      fireEvent.contextMenu(node)
    }

    // Context menu should not appear
    expect(screen.queryByTestId('graph-context-menu')).toBeNull()
  })

  it('does NOT show context menu when onRunStep is not provided', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const { container } = render(
      <GraphView graph={mockGraph} />
    )

    // Find a graph node and right-click
    const node = container.querySelector('[data-step-id="step1"]')
    if (node) {
      fireEvent.contextMenu(node)
    }

    // Context menu should not appear
    expect(screen.queryByTestId('graph-context-menu')).toBeNull()

    // Cleanup
    delete (window as any).electronAPI
  })

  it('shows context menu on right-click in Electron when onRunStep is provided', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    const { container } = render(
      <GraphView 
        graph={mockGraph}
        onRunStep={onRunStep}
      />
    )

    // Find a graph node rect and right-click
    const node = container.querySelector('g[data-step-id="step1"] rect')
    expect(node).toBeDefined()
    
    if (node) {
      fireEvent.contextMenu(node, { clientX: 100, clientY: 200 })
    }

    // Context menu should appear
    const contextMenu = screen.getByTestId('graph-context-menu')
    expect(contextMenu).toBeDefined()
    expect(screen.getByTestId('context-menu-run')).toBeDefined()
    expect(screen.getByText('▶️ Run this step')).toBeDefined()

    // Cleanup
    delete (window as any).electronAPI
  })

  it('calls onRunStep when context menu Run option is clicked', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    const { container } = render(
      <GraphView 
        graph={mockGraph}
        onRunStep={onRunStep}
      />
    )

    // Right-click on a node rect
    const node = container.querySelector('g[data-step-id="step1"] rect')
    if (node) {
      fireEvent.contextMenu(node, { clientX: 100, clientY: 200 })
    }

    // Click the Run option
    const runOption = screen.getByTestId('context-menu-run')
    fireEvent.click(runOption)

    expect(onRunStep).toHaveBeenCalledWith('step1')
    expect(onRunStep).toHaveBeenCalledTimes(1)

    // Context menu should close
    expect(screen.queryByTestId('graph-context-menu')).toBeNull()

    // Cleanup
    delete (window as any).electronAPI
  })

  it('closes context menu when clicking elsewhere', async () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    const { container } = render(
      <GraphView
        graph={mockGraph}
        onRunStep={onRunStep}
      />
    )

    // Right-click on a node rect
    const node = container.querySelector('g[data-step-id="step1"] rect')
    if (node) {
      fireEvent.contextMenu(node, { clientX: 100, clientY: 200 })
    }

    // Context menu should be visible
    expect(screen.getByTestId('graph-context-menu')).toBeDefined()

    // Click elsewhere (not on the context menu)
    fireEvent.click(document.body)

    // Wait for state update and re-render
    await new Promise(resolve => setTimeout(resolve, 0))

    // Context menu should close
    expect(screen.queryByTestId('graph-context-menu')).toBeNull()

    // Cleanup
    delete (window as any).electronAPI
  })

  it('renders zoom controls', () => {
    render(<GraphView graph={mockGraph} />)
    
    expect(screen.getByTitle('Zoom In')).toBeDefined()
    expect(screen.getByTitle('Zoom Out')).toBeDefined()
    expect(screen.getByTitle('Reset Zoom')).toBeDefined()
  })

  it('filters steps when visibleStepIds is provided', () => {
    const visibleSteps = new Set(['step1'])
    const { container } = render(
      <GraphView
        graph={mockGraph}
        visibleStepIds={visibleSteps}
      />
    )
    
    // Step1 should be present
    expect(container.querySelector('g[data-step-id="step1"]')).toBeDefined()
    
    // Step2 should not be present (filtered out)
    expect(container.querySelector('g[data-step-id="step2"]')).toBeNull()
  })
})
