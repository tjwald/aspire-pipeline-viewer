import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GraphView } from '@aspire/shared/components/GraphView';
import type { PipelineGraph } from '@aspire/core';

describe('GraphView (Pipeline Visualization)', () => {
  const mockGraph: PipelineGraph = {
    id: 'test-pipeline',
    name: 'Test Pipeline',
    steps: [
      { id: 'step-1', name: 'Build', status: 'success' },
      { id: 'step-2', name: 'Test', status: 'running' },
      { id: 'step-3', name: 'Deploy', status: 'pending' },
    ],
    edges: [
      { id: 'e1', source: 'step-1', target: 'step-2' },
      { id: 'e2', source: 'step-2', target: 'step-3' },
    ],
  };

  it('should render graph nodes for each step', () => {
    render(<GraphView graph={mockGraph} />);
    expect(screen.getByText('Build')).toBeVisible();
    expect(screen.getByText('Test')).toBeVisible();
    expect(screen.getByText('Deploy')).toBeVisible();
  });
});
