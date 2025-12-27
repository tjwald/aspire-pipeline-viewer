import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GraphView } from '@aspire-pipeline-viewer/shared/components/GraphView';
import { ExecutionStatus, type PipelineGraph } from '@aspire-pipeline-viewer/core';
import { describe, expect, it } from 'vitest';

describe('GraphView (Pipeline Visualization)', () => {
  const mockGraph: PipelineGraph = {
    id: 'test-pipeline',
    name: 'Test Pipeline',
    steps: [
      { id: 'step-1', name: 'Build', status: ExecutionStatus.Success },
      { id: 'step-2', name: 'Test', status: ExecutionStatus.Running },
      { id: 'step-3', name: 'Deploy', status: ExecutionStatus.Pending },
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
