import React from 'react'
import '../styles/toolbar.css'

type ToolbarProps = {
  onReload?: () => void
  onLoadFile?: () => void
  onExportJson?: () => void
  statusText?: string
  zoomLabel?: string
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
}

export function Toolbar({ onReload, onLoadFile, onExportJson, statusText = 'Ready', zoomLabel = '100%', onZoomIn, onZoomOut, onZoomReset }: ToolbarProps) {
  return (
    <div className="graph-toolbar">
      <button className="toolbar-btn" title="Reload Diagnostics" onClick={onReload}>
        🔄
      </button>
      <button className="toolbar-btn" title="Load from File" onClick={onLoadFile}>
        📂
      </button>
      <button className="toolbar-btn" title="Export as JSON" onClick={onExportJson}>
        💾
      </button>
      <div className="toolbar-spacer" />
      <button className="toolbar-btn" title="Zoom In" onClick={onZoomIn}>
        🔍+
      </button>
      <button className="toolbar-btn" title="Zoom Out" onClick={onZoomOut}>
        🔍−
      </button>
      <button className="toolbar-btn" title="Reset Zoom" onClick={onZoomReset}>
        🔍
      </button>
      <span className="status-text">{zoomLabel}</span>
      <span className="status-text">{statusText}</span>
    </div>
  )
}
