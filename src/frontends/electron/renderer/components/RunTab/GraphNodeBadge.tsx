import React from 'react'

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export interface GraphNodeBadgeProps {
  status: StepStatus
  x: number
  y: number
}

const statusConfig: Record<StepStatus, { symbol: string; color: string; bgColor: string }> = {
  pending: { symbol: '○', color: '#858585', bgColor: 'rgba(133,133,133,0.2)' },
  running: { symbol: '◉', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.2)' },
  success: { symbol: '✓', color: '#22c55e', bgColor: 'rgba(34,197,94,0.2)' },
  failed: { symbol: '✗', color: '#ef4444', bgColor: 'rgba(239,68,68,0.2)' },
  skipped: { symbol: '⊘', color: '#6b7280', bgColor: 'rgba(107,114,128,0.2)' },
}

export function GraphNodeBadge({ status, x, y }: GraphNodeBadgeProps) {
  const config = statusConfig[status]
  const size = 20

  return (
    <g className={`graph-node-badge status-${status}`} data-testid={`badge-${status}`}>
      <circle cx={x} cy={y} r={size / 2} fill={config.bgColor} stroke={config.color} strokeWidth={1.5} />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
        fill={config.color}
      >
        {config.symbol}
      </text>
      {status === 'running' && (
        <circle
          cx={x}
          cy={y}
          r={size / 2 + 2}
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          strokeDasharray="4 4"
          className="running-pulse"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${x} ${y}`}
            to={`360 ${x} ${y}`}
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  )
}

export interface NodeStatusesMap {
  [stepId: string]: StepStatus
}
