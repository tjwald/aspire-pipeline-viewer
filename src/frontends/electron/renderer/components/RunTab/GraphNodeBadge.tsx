import React from 'react'
import { ExecutionStatus } from '@aspire-pipeline-viewer/core'

export interface GraphNodeBadgeProps {
  status: ExecutionStatus
  x: number
  y: number
}

const statusConfig: Record<ExecutionStatus, { symbol: string; color: string; bgColor: string }> = {
  pending: { symbol: '○', color: '#858585', bgColor: 'rgba(133,133,133,0.2)' },
  running: { symbol: '◉', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.2)' },
  success: { symbol: '✓', color: '#22c55e', bgColor: 'rgba(34,197,94,0.2)' },
  failed: { symbol: '✗', color: '#ef4444', bgColor: 'rgba(239,68,68,0.2)' },
  skipped: { symbol: '⊘', color: '#6b7280', bgColor: 'rgba(107,114,128,0.2)' },
}

export function GraphNodeBadge({ status, x, y }: GraphNodeBadgeProps) {
  // Implementation copied from the previous inline graph-node-badge
  // Used in GraphView.tsx before refactor
  const statusBadgeColors: Record<ExecutionStatus, string> = {
    pending: '#bdbdbd',
    running: '#2196f3',
    success: '#43a047',
    failed: '#e53935',
    skipped: '#bdbdbd',
  }
  const statusBadgeIcons: Record<ExecutionStatus, string> = {
    pending: '⏳',
    running: '▶️',
    success: '✔️',
    failed: '❌',
    skipped: '⏭️',
  }
  return (
    <g className={`graph-node-badge status-${status}`} data-testid={`badge-${status}`}
      >
      <title>{status.charAt(0).toUpperCase() + status.slice(1)}</title>
      <circle
        cx={x}
        cy={y}
        r={14}
        fill={statusBadgeColors[status]}
        stroke="#222"
        strokeWidth={2}
        filter="url(#shadow)"
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="#fff"
      >
        {statusBadgeIcons[status]}
      </text>
    </g>
  )
}

export interface NodeStatusesMap {
  [stepId: string]: ExecutionStatus
}
