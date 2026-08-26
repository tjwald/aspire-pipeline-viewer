import React from 'react'
import { ExecutionStatus } from '@aspire-pipeline-viewer/core'
import type { StepStatus } from '@aspire-pipeline-viewer/core'

export type GraphNodeStatus = StepStatus | ExecutionStatus.Skipped

export interface GraphNodeBadgeProps {
  status: GraphNodeStatus
  x: number
  y: number
}

const statusConfig: Record<GraphNodeStatus, { symbol: string; color: string }> = {
  pending: { symbol: '⏳', color: '#bdbdbd' },
  running: { symbol: '▶️', color: '#2196f3' },
  success: { symbol: '✔️', color: '#43a047' },
  failed: { symbol: '❌', color: '#e53935' },
  skipped: { symbol: '⏭️', color: '#bdbdbd' },
}

export function GraphNodeBadge({ status, x, y }: GraphNodeBadgeProps) {
  return (
    <g className={`graph-node-badge status-${status}`} data-testid={`badge-${status}`}>
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

export type NodeStatusesMap = Record<string, StepStatus>