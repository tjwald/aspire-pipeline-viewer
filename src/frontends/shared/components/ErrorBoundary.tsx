import React, { Component, type ReactNode } from 'react'

export type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
  section?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.section || 'component'}:`, error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <h3>⚠️ Something went wrong</h3>
            {this.props.section && <p>Error in: {this.props.section}</p>}
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error?.message}</pre>
            </details>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
