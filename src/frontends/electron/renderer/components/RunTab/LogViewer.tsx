import React, { useEffect, useRef, useState, useMemo } from 'react'

export interface LogLine {
  timestamp: number
  text: string
  stepName?: string
}

export interface LogViewerProps {
  logs: LogLine[]
  selectedStepId?: string
  autoScroll?: boolean
}

/**
 * Basic ANSI color code to CSS span conversion
 */
function parseAnsi(text: string): React.ReactNode[] {
  // Safety check for undefined/null text
  if (!text) return [text]
  
  const result: React.ReactNode[] = []
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[([0-9;]*)m/g
  let lastIndex = 0
  let currentStyle: React.CSSProperties = {}
  let match: RegExpExecArray | null

  const colorMap: Record<number, string> = {
    30: '#000',
    31: '#e74c3c',
    32: '#2ecc71',
    33: '#f39c12',
    34: '#3498db',
    35: '#9b59b6',
    36: '#1abc9c',
    37: '#ecf0f1',
    90: '#7f8c8d',
    91: '#e74c3c',
    92: '#2ecc71',
    93: '#f1c40f',
    94: '#3498db',
    95: '#9b59b6',
    96: '#1abc9c',
    97: '#ffffff',
  }

  const bgColorMap: Record<number, string> = {
    40: '#000',
    41: '#e74c3c',
    42: '#2ecc71',
    43: '#f39c12',
    44: '#3498db',
    45: '#9b59b6',
    46: '#1abc9c',
    47: '#ecf0f1',
  }

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape code
    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index)
      if (Object.keys(currentStyle).length > 0) {
        result.push(
          <span key={`${lastIndex}-${match.index}`} style={currentStyle}>
            {chunk}
          </span>
        )
      } else {
        result.push(chunk)
      }
    }

    // Parse the escape codes
    const codes = match[1].split(';').map(Number)
    for (const code of codes) {
      if (code === 0) {
        currentStyle = {}
      } else if (code === 1) {
        currentStyle = { ...currentStyle, fontWeight: 'bold' }
      } else if (code === 4) {
        currentStyle = { ...currentStyle, textDecoration: 'underline' }
      } else if (colorMap[code]) {
        currentStyle = { ...currentStyle, color: colorMap[code] }
      } else if (bgColorMap[code]) {
        currentStyle = { ...currentStyle, backgroundColor: bgColorMap[code] }
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const chunk = text.slice(lastIndex)
    if (Object.keys(currentStyle).length > 0) {
      result.push(
        <span key={`${lastIndex}-end`} style={currentStyle}>
          {chunk}
        </span>
      )
    } else {
      result.push(chunk)
    }
  }

  return result.length > 0 ? result : [text]
}

export function LogViewer({ logs, selectedStepId, autoScroll = true }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)

  // Filter logs based on selected step
  const filteredLogs = useMemo(() => {
    if (!selectedStepId) return logs
    return logs.filter((log) => (!log.stepName && !selectedStepId) || log.stepName === selectedStepId)
  }, [logs, selectedStepId])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll, userScrolled])

  // Detect user scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30
    setUserScrolled(!isAtBottom)
  }

  // Reset scroll state when filter changes
  useEffect(() => {
    setUserScrolled(false)
  }, [selectedStepId])

  const formatTime = (timestamp: number): string => {
    // Handle invalid timestamps
    if (!timestamp || isNaN(timestamp)) {
      return new Date().toLocaleTimeString('en-US', { hour12: false })
    }
    const date = new Date(timestamp)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString('en-US', { hour12: false })
    }
    return date.toLocaleTimeString('en-US', { hour12: false })
  }

  return (
    <div className="log-viewer" data-testid="log-viewer">
      <div className="log-viewer-header">
        <span className="log-filter-label">
          {selectedStepId ? `Logs: ${selectedStepId}` : 'All Logs'}
        </span>
        <span className="log-count">{filteredLogs.length} lines</span>
      </div>
      <div
        ref={containerRef}
        className="log-viewer-content"
        onScroll={handleScroll}
        data-testid="log-viewer-content"
      >
        {filteredLogs.length === 0 ? (
          <div className="log-empty">No logs yet...</div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div key={`${log.timestamp}-${idx}`} className="log-line" data-step={log.stepName}>
              <span className="log-timestamp">{formatTime(log.timestamp)}</span>
              <span className="log-text">{parseAnsi(log.text)}</span>
            </div>
          ))
        )}
      </div>
      {userScrolled && (
        <button
          className="log-scroll-button"
          onClick={() => {
            setUserScrolled(false)
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          }}
          data-testid="scroll-to-bottom"
        >
          ↓ Scroll to bottom
        </button>
      )}
      <style>{`
        .log-viewer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          position: relative;
        }
        .log-viewer-header {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          color: #858585;
        }
        .log-filter-label {
          font-weight: 600;
          color: #ccc;
        }
        .log-count {
          font-size: 11px;
        }
        .log-viewer-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .log-empty {
          color: #858585;
          font-style: italic;
          padding: 20px;
          text-align: center;
        }
        .log-line {
          display: flex;
          gap: 12px;
          padding: 2px 0;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .log-timestamp {
          color: #6a9955;
          flex-shrink: 0;
        }
        .log-text {
          color: #d4d4d4;
        }
        .log-scroll-button {
          position: absolute;
          bottom: 16px;
          right: 16px;
          padding: 6px 12px;
          background: #0e639c;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          z-index: 10;
        }
        .log-scroll-button:hover {
          background: #1177bb;
        }
      `}</style>
    </div>
  )
}
