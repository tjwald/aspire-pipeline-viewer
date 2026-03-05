import React from 'react'
import { ExecutionStatus } from '@aspire-pipeline-viewer/core'

export interface GraphNodeBadgeProps {
  status: ExecutionStatus
  x: number
  y: number
}

const statusConfig: Record<ExecutionStatus, { symbol: string; color: string; bgColor: string }> = {
  pending: { symbol: '⏳', color: '#bdbdbd', bgColor: 'rgba(189,189,189,0.2)' },
  running: { symbol: '▶️', color: '#2196f3', bgColor: 'rgba(33,150,243,0.2)' },
  success: { symbol: '✔️', color: '#43a047', bgColor: 'rgba(67,160,71,0.2)' },
  failed: { symbol: '❌', color: '#e53935', bgColor: 'rgba(229,57,53,0.2)' },
  skipped: { symbol: '⏭️', color: '#bdbdbd', bgColor: 'rgba(189,189,189,0.2)' },
}

export function GraphNodeBadge({ status, x, y }: GraphNodeBadgeProps) {
  return (
    <g className={`graph-node-badge status-${status}`} data-testid={`badge-${status}`}
      >
      <title>{status.charAt(0).toUpperCase() + status.slice(1)}</title>
      <circle
        cx={x}
        cy={y}
        r={14}
        fill={statusConfig[status].color}
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
        {statusConfig[status].symbol}
      </text>
    </g>
  )
}

export interface NodeStatusesMap {
  [stepId: string]: ExecutionStatus
}
