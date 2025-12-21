import React, { useEffect, useMemo, useRef } from 'react'
import type { PipelineGraph } from '@aspire/core'
import { calculateHierarchicalPositions, getResourceColor, wrapStepName } from '../utils'
import { useZoomPan } from '../hooks/useZoomPan'
import '../styles/graph.css'

export type GraphViewProps = {
  graph: PipelineGraph
  selectedStepId?: string
  onSelectStep?: (id: string) => void
}

export function GraphView({ graph, selectedStepId, onSelectStep }: GraphViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { zoom, zoomIn, zoomOut, resetZoom, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, attachWheelZoom } =
    useZoomPan()

  useEffect(() => {
    const cleanup = attachWheelZoom(containerRef.current)
    return () => {
      if (cleanup) cleanup()
    }
  }, [attachWheelZoom])

  const positions = useMemo(() => calculateHierarchicalPositions(graph), [graph])

  const renderEdges = () => {
    const edges: React.ReactNode[] = []
    graph.steps.forEach((step) => {
      step.dependencies?.forEach((dep) => {
        const from = positions[dep]
        const to = positions[step.id]
        if (from && to) {
          edges.push(
            <line
              key={`${dep}->${step.id}`}
              className="graph-edge"
              x1={from.x}
              y1={from.y + 30}
              x2={to.x}
              y2={to.y - 30}
            />,
          )
        }
      })
    })
    return edges
  }

  const renderNodes = () => {
    return graph.steps.map((step) => {
      const pos = positions[step.id]
      const lines = wrapStepName(step.name)
      const nodeColor = getResourceColor(step.resource)
      const isSelected = selectedStepId === step.id

      return (
        <g key={step.id} className={`graph-node ${isSelected ? 'selected' : ''}`} data-step-id={step.id}>
          <rect
            x={pos.x - 90}
            y={pos.y - 35}
            width={180}
            height={70}
            rx={12}
            ry={12}
            fill={nodeColor}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1.5}
            filter="url(#shadow)"
            onClick={() => onSelectStep?.(step.id)}
          />
          <text x={pos.x} y={pos.y - 8} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#ffffff">
            {lines.map((line, idx) => (
              <tspan key={idx} x={pos.x} dy={idx === 0 ? '0' : '1.2em'}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )
    })
  }

  return (
    <div className="graph-area">
      <div className="graph-toolbar">
        <button className="toolbar-btn" onClick={zoomIn} title="Zoom In">
          🔍+
        </button>
        <button className="toolbar-btn" onClick={zoomOut} title="Zoom Out">
          🔍−
        </button>
        <button className="toolbar-btn" onClick={resetZoom} title="Reset Zoom">
          🔍
        </button>
        <div className="toolbar-spacer" />
      </div>
      <div
        className="graph-container"
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div className="graph-wrapper" ref={wrapperRef} style={{ transform: `scale(${zoom})` }}>
          <svg width={2000} height={1200} className="graph-svg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#858585" />
              </marker>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                <feOffset dx="2" dy="4" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="offsetblur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {renderEdges()}
            {renderNodes()}
          </svg>
        </div>
      </div>
    </div>
  )
}
