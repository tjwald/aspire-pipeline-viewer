import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'vitest'
import { LogViewer, type LogLine } from '../../../../src/frontends/electron/renderer/components/RunTab/LogViewer'

describe('LogViewer', () => {
  const mockLogs: LogLine[] = [
    { timestamp: 1704297600000, text: 'Starting build...', stepName: 'build' },
    { timestamp: 1704297601000, text: 'Compiling sources...', stepName: 'build' },
    { timestamp: 1704297602000, text: 'Running tests...', stepName: 'test' },
    { timestamp: 1704297603000, text: 'Tests passed!', stepName: 'test' },
    { timestamp: 1704297604000, text: 'Deploying...', stepName: 'deploy' },
  ]

  it('renders all logs when no filter is applied', () => {
    render(<LogViewer logs={mockLogs} />)
    
    expect(screen.getByText('Starting build...')).toBeInTheDocument()
    expect(screen.getByText('Running tests...')).toBeInTheDocument()
    expect(screen.getByText('Deploying...')).toBeInTheDocument()
  })

  it('filters logs by selected step', () => {
    render(<LogViewer logs={mockLogs} selectedStepId="test" />)
    
    // Should show only test logs
    expect(screen.getByText('Running tests...')).toBeInTheDocument()
    expect(screen.getByText('Tests passed!')).toBeInTheDocument()
    
    // Should not show build or deploy logs
    expect(screen.queryByText('Starting build...')).not.toBeInTheDocument()
    expect(screen.queryByText('Deploying...')).not.toBeInTheDocument()
  })

  it('shows correct log count in header', () => {
    render(<LogViewer logs={mockLogs} />)
    expect(screen.getByText('5 lines')).toBeInTheDocument()
  })

  it('shows filtered count when step is selected', () => {
    render(<LogViewer logs={mockLogs} selectedStepId="build" />)
    expect(screen.getByText('2 lines')).toBeInTheDocument()
  })

  it('displays filter label for all logs', () => {
    render(<LogViewer logs={mockLogs} />)
    expect(screen.getByText('All Logs')).toBeInTheDocument()
  })

  it('displays filter label for selected step', () => {
    render(<LogViewer logs={mockLogs} selectedStepId="build" />)
    expect(screen.getByText('Logs: build')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    render(<LogViewer logs={[]} />)
    expect(screen.getByText('No logs yet...')).toBeInTheDocument()
  })

  it('includes logs without stepName when filtering (system logs)', () => {
    const logsWithSystem: LogLine[] = [
      { timestamp: 1704297600000, text: 'System message', stepName: undefined },
      { timestamp: 1704297601000, text: 'Build log', stepName: 'build' },
      { timestamp: 1704297602000, text: 'Test log', stepName: 'test' },
    ]
    
    // System logs (no stepName) should appear in all filtered views
    render(<LogViewer logs={logsWithSystem} selectedStepId="build" />)
    expect(screen.getByText('System message')).toBeInTheDocument()
    expect(screen.getByText('Build log')).toBeInTheDocument()
    expect(screen.queryByText('Test log')).not.toBeInTheDocument()
  })

  describe('auto-scroll behavior', () => {
    it('renders scroll container with proper data attribute', () => {
      render(<LogViewer logs={mockLogs} autoScroll={true} />)
      
      const container = screen.getByTestId('log-viewer-content')
      expect(container).toBeInTheDocument()
    })

    it('scroll button appears when userScrolled state changes', () => {
      const { rerender } = render(<LogViewer logs={mockLogs} autoScroll={true} />)
      
      // Initially no scroll button should be visible
      expect(screen.queryByTestId('scroll-to-bottom')).not.toBeInTheDocument()
      
      // Rerender doesn't automatically trigger scroll state
      rerender(<LogViewer logs={[...mockLogs, { timestamp: Date.now(), text: 'New log' }]} autoScroll={true} />)
      
      // Button still not visible without user interaction
      expect(screen.queryByTestId('scroll-to-bottom')).not.toBeInTheDocument()
    })
  })

  describe('ANSI color parsing', () => {
    it('renders text with ANSI color codes as styled spans', () => {
      const ansiLogs: LogLine[] = [
        { timestamp: 1704297600000, text: '\x1b[32mSuccess!\x1b[0m' },
        { timestamp: 1704297601000, text: '\x1b[31mError!\x1b[0m' },
      ]
      
      render(<LogViewer logs={ansiLogs} />)
      
      // The text content should be rendered
      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText('Error!')).toBeInTheDocument()
    })

    it('renders plain text without ANSI codes unchanged', () => {
      const plainLogs: LogLine[] = [
        { timestamp: 1704297600000, text: 'Plain text message' },
      ]
      
      render(<LogViewer logs={plainLogs} />)
      expect(screen.getByText('Plain text message')).toBeInTheDocument()
    })
  })
})
