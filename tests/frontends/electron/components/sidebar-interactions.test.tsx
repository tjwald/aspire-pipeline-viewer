import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '@aspire/shared/components/Sidebar';
import type { PipelineGraph } from '@aspire/core';

describe('Sidebar Interactions', () => {
	const mockGraph: PipelineGraph = {
		id: 'test',
		name: 'Test Pipeline',
		steps: [],
		edges: [],
	};

	it('should display sidebar header', () => {
		render(<Sidebar graph={mockGraph} />);
		expect(screen.getByText('Workspace')).toBeVisible();
	});

	it('should show workspace section', () => {
		render(<Sidebar graph={mockGraph} workspaceName="TestWorkspace" workspacePath="/path/to/workspace" />);
		expect(screen.getByText('TestWorkspace')).toBeVisible();
		expect(screen.getByText('/path/to/workspace')).toBeVisible();
	});
});
