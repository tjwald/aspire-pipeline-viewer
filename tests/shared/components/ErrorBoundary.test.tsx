import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../../../src/frontends/shared/components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error during tests since we expect errors
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Child content')).toBeDefined()
  })

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('⚠️ Something went wrong')).toBeDefined()
  })

  it('shows error message in details', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test error message')).toBeDefined()
  })

  it('shows section name when provided', () => {
    render(
      <ErrorBoundary section="Graph View">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Error in: Graph View')).toBeDefined()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom fallback')).toBeDefined()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('Test error message')
  })

  it('has retry button that attempts to reset state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('⚠️ Something went wrong')).toBeDefined()
    
    // Retry button exists
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeDefined()
    
    // Clicking it doesn't crash
    fireEvent.click(retryButton)
  })

  it('logs error to console', () => {
    render(
      <ErrorBoundary section="Test Section">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(console.error).toHaveBeenCalled()
  })

  it('contains error details expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    const details = screen.getByText('Error details')
    expect(details.tagName.toLowerCase()).toBe('summary')
  })
})
