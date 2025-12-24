import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '@aspire/shared/components/Sidebar';
import type { PipelineGraph } from '@aspire/core';
import { describe, expect, it } from 'vitest';

describe('Sidebar (Workspace Selection)', () => {
  const mockGraph: PipelineGraph = {
    id: 'test',
    name: 'Test Pipeline',
    steps: [],
    edges: [],
  };

  it('should display sidebar with workspace section', () => {
    render(
      <Sidebar graph={mockGraph} workspaceName="TestWorkspace" workspacePath="/path/to/workspace" />
    );
    expect(screen.getByText('Workspace')).toBeVisible();
    expect(screen.getByText('TestWorkspace')).toBeVisible();
    expect(screen.getByText('/path/to/workspace')).toBeVisible();
  });

  it('should show "Select AppHost Directory" button', () => {
    render(
      <Sidebar graph={mockGraph} workspaceName="TestWorkspace" workspacePath="/path/to/workspace" />
    );
    expect(screen.getByRole('button', { name: /Select AppHost Directory/i })).toBeVisible();
  });
});
