import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraphView } from '@/frontends/shared/components/GraphView'
import { ExecutionStatus, type PipelineGraph } from '@aspire/core'

const mockGraph: PipelineGraph = {
  id: 'test',
  name: 'Test Pipeline',
  steps: [
    {
      id: 'step1',
      name: 'Build',
      description: 'Build the app',
      dependencies: [],
      resource: 'builder (Type)',
      tags: ['build'],
      status: ExecutionStatus.Success,
    },
    {
      id: 'step2',
      name: 'Test',
      description: 'Run tests',
      dependencies: ['step1'],
      resource: 'tester (Type)',
      tags: ['test'],
      status: ExecutionStatus.Pending,
    },
  ],
  edges: [{ id: 'edge1', source: 'step1', target: 'step2' }],
}

describe('GraphView', () => {
  it('should render without crashing', () => {
    const onSelect = vi.fn()
    render(
      <GraphView
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        visibleSteps={new Set(['step1', 'step2'])}
      />
    )

    // Component renders
    expect(screen.getByText(/Build/i)).toBeInTheDocument()
  })

  it('should render all visible steps', () => {
    const onSelect = vi.fn()
    render(
      <GraphView
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        visibleSteps={new Set(['step1', 'step2'])}
      />
    )

    expect(screen.getByText(/Build/i)).toBeInTheDocument()
    expect(screen.getByText(/Test/i)).toBeInTheDocument()
  })

  it('should filter out hidden steps', () => {
    const onSelect = vi.fn()
    render(
      <GraphView
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        visibleSteps={new Set(['step1'])} // Only step1 visible
      />
    )

    expect(screen.getByText(/Build/i)).toBeInTheDocument()
    expect(screen.queryByText(/Test/i)).not.toBeInTheDocument()
  })

  it('should render empty state with no steps', () => {
    const emptyGraph: PipelineGraph = {
      id: 'empty',
      name: 'Empty',
      steps: [],
      edges: [],
    }
    const onSelect = vi.fn()
    render(
      <GraphView
        graph={emptyGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        visibleSteps={new Set()}
      />
    )

    // Should render without error
    expect(screen.queryByText(/Build/i)).not.toBeInTheDocument()
  })

  it('should include zoom controls', () => {
    const onSelect = vi.fn()
    render(
      <GraphView
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        visibleSteps={new Set(['step1', 'step2'])}
      />
    )

    // Check for zoom buttons
    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })
})
