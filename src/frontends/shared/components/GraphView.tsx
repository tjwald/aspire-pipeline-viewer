import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'
import { calculateHierarchicalPositions, getResourceColor, wrapStepName, isAggregator, type CenterLane } from '../utils'
import { useZoomPan } from '../hooks/useZoomPan'
import '../styles/graph.css'

export type GraphViewProps = {
  graph: PipelineGraph
  selectedStepId?: string
  onSelectStep?: (id: string) => void
  visibleStepIds?: Set<string>
}

export function GraphView({ graph, selectedStepId, onSelectStep, visibleStepIds }: GraphViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null)
  const { zoom, zoomIn, zoomOut, resetZoom, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, attachWheelZoom } =
    useZoomPan()

  useEffect(() => {
    const cleanup = attachWheelZoom(containerRef.current)
    return () => {
      if (cleanup) cleanup()
    }
  }, [attachWheelZoom])

  // Create a filtered graph with only visible steps
  const filteredGraph = useMemo((): PipelineGraph => {
    if (!visibleStepIds) return graph
    
    const visibleSteps = graph.steps.filter(step => visibleStepIds.has(step.id))
    const visibleStepIdSet = new Set(visibleSteps.map(s => s.id))
    
    // Filter edges to only include those between visible steps
    const visibleEdges = graph.edges.filter(edge => 
      visibleStepIdSet.has(edge.source) && visibleStepIdSet.has(edge.target)
    )
    
    // Filter step dependencies to only include visible steps
    const filteredSteps = visibleSteps.map(step => ({
      ...step,
      dependencies: step.dependencies?.filter(depId => visibleStepIdSet.has(depId))
    }))
    
    return {
      ...graph,
      steps: filteredSteps,
      edges: visibleEdges
    }
  }, [graph, visibleStepIds])

  const layoutResult = useMemo(() => calculateHierarchicalPositions(filteredGraph), [filteredGraph])
  const { positions, resourceColumns, centerLane, canvasHeight } = layoutResult

  // Calculate dynamic canvas size based on node positions
  const canvasSize = useMemo(() => {
    const posValues = Object.values(positions)
    if (posValues.length === 0) return { width: 1000, height: 800 }
    
    const maxX = Math.max(...posValues.map((p) => p.x)) + 200 // padding for node width
    const maxY = Math.max(...posValues.map((p) => p.y)) + 150 // padding for node height
    
    return {
      width: Math.max(1000, maxX),
      height: Math.max(800, maxY, canvasHeight),
    }
  }, [positions, canvasHeight])

  // Determine which step to highlight edges for (selected takes precedence over hover)
  const _highlightedStepId = selectedStepId || hoveredStepId

  // Calculate transitive predecessors for a step
  const getTransitivePredecessors = useMemo(() => {
    const cache: Record<string, Set<string>> = {}
    
    function getPredecessors(stepId: string, visited = new Set<string>()): Set<string> {
      if (cache[stepId]) return cache[stepId]
      if (visited.has(stepId)) return new Set()
      visited.add(stepId)
      
      const step = filteredGraph.steps.find((s) => s.id === stepId)
      const predecessors = new Set<string>()
      
      if (step?.dependencies) {
        step.dependencies.forEach((depId) => {
          predecessors.add(depId)
          // Recursively get predecessors of predecessors
          getPredecessors(depId, visited).forEach((id) => predecessors.add(id))
        })
      }
      
      cache[stepId] = predecessors
      return predecessors
    }
    
    return getPredecessors
  }, [filteredGraph])

  // Calculate transitive successors for a step
  const getTransitiveSuccessors = useMemo(() => {
    const cache: Record<string, Set<string>> = {}
    
    // Build reverse dependency map
    const dependents: Record<string, string[]> = {}
    filteredGraph.steps.forEach((step) => {
      step.dependencies?.forEach((depId) => {
        if (!dependents[depId]) dependents[depId] = []
        dependents[depId].push(step.id)
      })
    })
    
    function getSuccessors(stepId: string, visited = new Set<string>()): Set<string> {
      if (cache[stepId]) return cache[stepId]
      if (visited.has(stepId)) return new Set()
      visited.add(stepId)
      
      const successors = new Set<string>()
      const deps = dependents[stepId] || []
      
      deps.forEach((succId) => {
        successors.add(succId)
        getSuccessors(succId, visited).forEach((id) => successors.add(id))
      })
      
      cache[stepId] = successors
      return successors
    }
    
    return getSuccessors
  }, [filteredGraph])

  // Get highlighted predecessors and successors for the selected node (full chain on click)
  const highlightedPredecessors = useMemo(() => {
    if (!selectedStepId) return new Set<string>()
    return getTransitivePredecessors(selectedStepId)
  }, [selectedStepId, getTransitivePredecessors])

  const highlightedSuccessors = useMemo(() => {
    if (!selectedStepId) return new Set<string>()
    return getTransitiveSuccessors(selectedStepId)
  }, [selectedStepId, getTransitiveSuccessors])

  // Handle node click - toggle selection
  const handleNodeClick = (stepId: string) => {
    if (selectedStepId === stepId) {
      // Already selected - deselect
      onSelectStep?.('')
    } else {
      // Select this node
      onSelectStep?.(stepId)
    }
  }

  const renderResourceColumns = () => {
    return resourceColumns.map((col) => (
      <g key={col.name} className="resource-column">
        {/* Column background */}
        <rect
          x={col.startX}
          y={20}
          width={col.width}
          height={canvasSize.height - 40}
          fill="rgba(255, 255, 255, 0.03)"
          rx={8}
        />
        {/* Column header background - full width like pipeline */}
        <rect
          x={col.startX}
          y={30}
          width={col.width}
          height={28}
          fill={col.color}
          opacity={0.9}
          rx={4}
        />
        {/* Column header text */}
        <text
          x={col.centerX}
          y={49}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="#e0e0e0"
        >
          {col.displayName}
        </text>
      </g>
    ))
  }

  const renderCenterLane = (lane: CenterLane) => {
    return (
      <g className="center-lane">
        {/* Lane background */}
        <rect
          x={lane.startX}
          y={60}
          width={lane.width}
          height={canvasSize.height - 80}
          fill="rgba(234, 179, 8, 0.08)"
          stroke="rgba(234, 179, 8, 0.3)"
          strokeDasharray="4 4"
          rx={8}
        />
        {/* Lane header background */}
        <rect
          x={lane.startX}
          y={30}
          width={lane.width}
          height={28}
          fill="#d97706"
          opacity={0.9}
          rx={4}
        />
        {/* Lane header text */}
        <text
          x={lane.centerX}
          y={49}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="#e0e0e0"
        >
          ⚡ PIPELINE
        </text>
      </g>
    )
  }

  const renderEdges = () => {
    const edges: React.ReactNode[] = []
    filteredGraph.steps.forEach((step) => {
      step.dependencies?.forEach((dep) => {
        const from = positions[dep]
        const to = positions[step.id]
        const fromStep = filteredGraph.steps.find((s) => s.id === dep)
        const toStep = step
        
        if (from && to) {
          const isFromAgg = fromStep && isAggregator(fromStep)
          const isToAgg = isAggregator(toStep)
          
          const x1 = from.x
          const y1 = from.y + (isFromAgg ? 38 : 35)
          const x2 = to.x
          const y2 = to.y - (isToAgg ? 38 : 35)

          // Use curved paths for better clarity
          const midY = (y1 + y2) / 2
          const dx = Math.abs(x2 - x1)
          const curvature = Math.min(dx * 0.4, 40)

          const path = `M ${x1} ${y1} C ${x1} ${midY + curvature}, ${x2} ${midY - curvature}, ${x2} ${y2}`

          // Determine if this edge should be highlighted
          let edgeClass = 'graph-edge'
          
          if (selectedStepId) {
            // Full chain highlight on selection
            // Incoming: edge leads TO selected node or any predecessor in the chain
            const isInChain = 
              (step.id === selectedStepId && highlightedPredecessors.has(dep)) ||
              (highlightedPredecessors.has(step.id) && highlightedPredecessors.has(dep)) ||
              (highlightedPredecessors.has(step.id) && dep === selectedStepId)
            
            // Outgoing: edge leads FROM selected node or to any successor in the chain  
            const isOutChain =
              (dep === selectedStepId && highlightedSuccessors.has(step.id)) ||
              (highlightedSuccessors.has(dep) && highlightedSuccessors.has(step.id)) ||
              (highlightedSuccessors.has(dep) && step.id === selectedStepId)
            
            if (isInChain) edgeClass += ' highlighted-incoming'
            else if (isOutChain) edgeClass += ' highlighted-outgoing'
          } else if (hoveredStepId) {
            // Simple immediate highlight on hover
            const isIncoming = hoveredStepId === step.id
            const isOutgoing = hoveredStepId === dep
            
            if (isIncoming) edgeClass += ' highlighted-incoming'
            else if (isOutgoing) edgeClass += ' highlighted-outgoing'
          }

          edges.push(
            <path
              key={`${dep}->${step.id}`}
              className={edgeClass}
              d={path}
              fill="none"
              data-from={dep}
              data-to={step.id}
            />,
          )
        }
      })
    })
    return edges
  }

  const renderNodes = () => {
    return filteredGraph.steps
      .filter((step) => !isAggregator(step))
      .map((step) => {
        const pos = positions[step.id]
        if (!pos) return null
        
        const lines = wrapStepName(step.name)
        const nodeColor = getResourceColor(step.resource)
        const isSelected = selectedStepId === step.id

        return (
          <g
            key={step.id}
            className={`graph-node ${isSelected ? 'selected' : ''}`}
            data-step-id={step.id}
            onMouseEnter={() => setHoveredStepId(step.id)}
            onMouseLeave={() => setHoveredStepId(null)}
          >
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
              onClick={() => handleNodeClick(step.id)}
              style={{ cursor: 'pointer' }}
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

  const renderAggregatorNodes = () => {
    return filteredGraph.steps
      .filter((step) => isAggregator(step))
      .map((step) => {
        const pos = positions[step.id]
        if (!pos) return null
        
        const isSelected = selectedStepId === step.id
        const size = 45

        // Hexagon points
        const hexPoints = [
          [pos.x - size, pos.y],
          [pos.x - size / 2, pos.y - size * 0.85],
          [pos.x + size / 2, pos.y - size * 0.85],
          [pos.x + size, pos.y],
          [pos.x + size / 2, pos.y + size * 0.85],
          [pos.x - size / 2, pos.y + size * 0.85],
        ]
          .map((p) => p.join(','))
          .join(' ')

        return (
          <g
            key={step.id}
            className={`graph-node aggregator-node ${isSelected ? 'selected' : ''}`}
            data-step-id={step.id}
            onMouseEnter={() => setHoveredStepId(step.id)}
            onMouseLeave={() => setHoveredStepId(null)}
          >
            <polygon
              points={hexPoints}
              fill="#607d8b"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth={2}
              filter="url(#shadow)"
              onClick={() => handleNodeClick(step.id)}
              style={{ cursor: 'pointer' }}
            />
            {/* Icon */}
            <text x={pos.x} y={pos.y - 12} textAnchor="middle" fontSize={16}>
              ⚡
            </text>
            {/* Label */}
            <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#ffffff">
              {step.name}
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
          <svg width={canvasSize.width} height={canvasSize.height} className="graph-svg">
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 6 2, 0 4" fill="#888888" />
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
            {renderResourceColumns()}
            {centerLane && renderCenterLane(centerLane)}
            {renderEdges()}
            {renderNodes()}
            {renderAggregatorNodes()}
          </svg>
        </div>
      </div>
    </div>
  )
}
