import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailsPanel } from '../../../src/frontends/shared/components/DetailsPanel'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

const mockGraph: PipelineGraph = {
  id: 'test-graph',
  name: 'Test Graph',
  steps: [
    {
      id: 'step1',
      name: 'Step 1',
      resource: 'TestResource',
      tags: ['tag1', 'tag2'],
      dependencies: ['step0'],
      description: 'Test description',
    },
    {
      id: 'step2',
      name: 'Step 2',
      resource: 'AnotherResource',
    },
  ],
  edges: [
    { id: 'edge1', source: 'step0', target: 'step1' },
  ],
}

describe('DetailsPanel', () => {
  it('renders "Select a step" message when no step selected', () => {
    render(<DetailsPanel graph={mockGraph} selectedStepId={undefined} />)
    expect(screen.getByText('Select a step to view details')).toBeDefined()
  })

  it('renders step details when step is selected', () => {
    render(<DetailsPanel graph={mockGraph} selectedStepId="step1" />)
    expect(screen.getByText('Step 1')).toBeDefined()
    expect(screen.getByText('TestResource')).toBeDefined()
    expect(screen.getByText('Test description')).toBeDefined()
  })

  it('renders tags when present', () => {
    render(<DetailsPanel graph={mockGraph} selectedStepId="step1" />)
    expect(screen.getByText('tag1')).toBeDefined()
    expect(screen.getByText('tag2')).toBeDefined()
  })

  it('renders dependencies when present', () => {
    render(<DetailsPanel graph={mockGraph} selectedStepId="step1" />)
    expect(screen.getByText('step0')).toBeDefined()
  })

  it('does NOT render Run button when onRunStep is not provided', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    render(<DetailsPanel graph={mockGraph} selectedStepId="step1" />)
    expect(screen.queryByTestId('run-step-btn')).toBeNull()

    // Cleanup
    delete (window as any).electronAPI
  })

  it('renders Run button in Electron when onRunStep is provided and step is selected', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    render(
      <DetailsPanel 
        graph={mockGraph} 
        selectedStepId="step1" 
        onRunStep={onRunStep} 
      />
    )

    const runButton = screen.getByTestId('run-step-btn')
    expect(runButton).toBeDefined()
    expect(runButton.textContent).toContain('Run')

    // Cleanup
    delete (window as any).electronAPI
  })

  it('does NOT render Run button when not in Electron environment', () => {
    // Ensure window.electronAPI is undefined
    delete (window as any).electronAPI

    const onRunStep = vi.fn()
    render(
      <DetailsPanel 
        graph={mockGraph} 
        selectedStepId="step1" 
        onRunStep={onRunStep} 
      />
    )

    expect(screen.queryByTestId('run-step-btn')).toBeNull()
  })

  it('calls onRunStep with step ID when Run button is clicked', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    render(
      <DetailsPanel 
        graph={mockGraph} 
        selectedStepId="step1" 
        onRunStep={onRunStep} 
      />
    )

    const runButton = screen.getByTestId('run-step-btn')
    fireEvent.click(runButton)

    expect(onRunStep).toHaveBeenCalledWith('step1')
    expect(onRunStep).toHaveBeenCalledTimes(1)

    // Cleanup
    delete (window as any).electronAPI
  })

  it('does NOT render Run button when no step is selected', () => {
    // Mock window.electronAPI to simulate Electron environment
    const mockElectronAPI = { runStep: vi.fn() }
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    const onRunStep = vi.fn()
    render(
      <DetailsPanel 
        graph={mockGraph} 
        selectedStepId={undefined} 
        onRunStep={onRunStep} 
      />
    )

    expect(screen.queryByTestId('run-step-btn')).toBeNull()

    // Cleanup
    delete (window as any).electronAPI
  })
})
