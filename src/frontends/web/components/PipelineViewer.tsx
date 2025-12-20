import React, { useMemo } from 'react'
import ReactFlow, { Node, Background, Controls, useNodesState, useEdgesState, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import type { PipelineGraph, PipelineStep, ExecutionStatus } from '@/core'
import { EXECUTION_STATUS_COLORS } from '../theme'

interface Props {
  graph: PipelineGraph | null
  selectedNodeId: string | null
  onNodeSelected: (id: string) => void
}

export default function PipelineViewer({ graph, selectedNodeId, onNodeSelected }: Props) {
  const nodes = useMemo(() => {
    if (!graph) return []

    const visited = new Set<string>()
    const levels = new Map<string, number>()

    const calculateLevel = (stepId: string): number => {
      if (levels.has(stepId)) return levels.get(stepId)!
      if (visited.has(stepId)) return 0

      visited.add(stepId)
      const step = graph.steps.find((s) => s.id === stepId)
      if (!step || !step.dependencies || step.dependencies.length === 0) {
        levels.set(stepId, 0)
        return 0
      }

      const maxDependencyLevel = Math.max(...step.dependencies.map((depId) => calculateLevel(depId)))
      const level = maxDependencyLevel + 1
      levels.set(stepId, level)
      return level
    }

    graph.steps.forEach((step) => {
      calculateLevel(step.id)
    })

    const stepsByLevel = new Map<number, PipelineStep[]>()
    graph.steps.forEach((step) => {
      const level = levels.get(step.id) || 0
      if (!stepsByLevel.has(level)) stepsByLevel.set(level, [])
      stepsByLevel.get(level)!.push(step)
    })

    const nodeList: Node[] = []
    const nodeWidth = 200
    const nodeHeight = 80
    const levelWidth = 250

    stepsByLevel.forEach((stepsAtLevel, level) => {
      stepsAtLevel.forEach((step, index) => {
        const x = level * levelWidth
        const y = index * (nodeHeight + 30)
        const isSelected = selectedNodeId === step.id

        nodeList.push({
          id: step.id,
          data: {
            label: (
              <div style={{ fontSize: '12px', fontWeight: '500' }}>
                <div>{step.name}</div>
                {step.description && <div style={{ fontSize: '10px', color: '#666' }}>{step.description}</div>}
              </div>
            ),
          },
          position: { x, y },
          style: {
            background: isSelected ? '#1f2937' : EXECUTION_STATUS_COLORS[step.status as ExecutionStatus],
            color: isSelected || step.status === 'Success' || step.status === 'Failed' ? '#fff' : '#000',
            border: isSelected ? '3px solid #1f2937' : '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            width: nodeWidth,
            minHeight: nodeHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
          },
        })
      })
    })

    return nodeList
  }, [graph, selectedNodeId])

  const edges = useMemo(() => {
    if (!graph) return []
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#999', strokeWidth: 2 },
    }))
  }, [graph])

  const [reactFlowNodes, setNodes] = useNodesState(nodes)
  const [reactFlowEdges, setEdges] = useEdgesState(edges)

  React.useEffect(() => {
    setNodes(nodes)
  }, [nodes, setNodes])

  React.useEffect(() => {
    setEdges(edges)
  }, [edges, setEdges])

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p>No pipeline loaded</p>
          <p className="text-sm">Select an AppHost directory to visualize its pipeline</p>
        </div>
      </div>
    )
  }

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    onNodeSelected(node.id)
  }

  return (
    <div className="w-full h-full" style={{ position: 'relative' }}>
      <ReactFlow nodes={reactFlowNodes} edges={reactFlowEdges} onNodeClick={handleNodeClick} fitView>
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
