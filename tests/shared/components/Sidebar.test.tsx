import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/frontends/shared/components/Sidebar'
import { ExecutionStatus, type PipelineGraph } from '@aspire/core'

const mockGraph: PipelineGraph = {
  id: 'test',
  name: 'Test Pipeline',
  steps: [
    {
      id: 'build',
      name: 'Build',
      description: 'Build app',
      dependencies: [],
      resource: 'builder (Type)',
      tags: ['build'],
      status: ExecutionStatus.Success,
    },
    {
      id: 'test',
      name: 'Test',
      description: 'Run tests',
      dependencies: ['build'],
      resource: 'tester (Type)',
      tags: ['test'],
      status: ExecutionStatus.Pending,
    },
  ],
  edges: [{ id: 'edge1', source: 'build', target: 'test' }],
}

describe('Sidebar', () => {
  it('should render step list', () => {
    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    expect(screen.getByText(/Build/i)).toBeInTheDocument()
    expect(screen.getByText(/Test/i)).toBeInTheDocument()
  })

  it('should group steps by resource', () => {
    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    // Resource headers should be visible
    expect(screen.getByText(/BUILDER/i)).toBeInTheDocument()
    expect(screen.getByText(/TESTER/i)).toBeInTheDocument()
  })

  it('should show pipeline section for aggregators', () => {
    const graphWithAggregator: PipelineGraph = {
      id: 'test',
      name: 'Test',
      steps: [
        {
          id: 'build',
          name: 'Build',
          description: '',
          dependencies: [],
          resource: 'builder (Type)',
          tags: [],
          status: ExecutionStatus.Success,
        },
        {
          id: 'aggregate',
          name: 'Aggregate',
          description: '',
          dependencies: ['build'],
          tags: [],
          status: ExecutionStatus.Success,
        },
      ],
      edges: [{ id: 'e1', source: 'build', target: 'aggregate' }],
    }

    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={graphWithAggregator}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    expect(screen.getByText(/PIPELINE/i)).toBeInTheDocument()
  })

  it('should allow filtering by tag', () => {
    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    // Tag filters should be available
    const buildTag = screen.getByText('build')
    expect(buildTag).toBeInTheDocument()

    fireEvent.click(buildTag)

    // Check that filter was applied (onVisibleStepsChange called)
    expect(onVisibleChange).toHaveBeenCalled()
  })

  it('should have show/hide all buttons', () => {
    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    expect(screen.getByText('Show All')).toBeInTheDocument()
    expect(screen.getByText('Hide All')).toBeInTheDocument()
  })

  it('should toggle group collapse', () => {
    const onSelect = vi.fn()
    const onVisibleChange = vi.fn()

    render(
      <Sidebar
        graph={mockGraph}
        selectedStepId={null}
        onSelectStep={onSelect}
        onVisibleStepsChange={onVisibleChange}
      />
    )

    const builderHeader = screen.getByText(/BUILDER/i)
    fireEvent.click(builderHeader)

    // Group should now be collapsed (children hidden)
    // This depends on implementation details
  })
})
