export enum ExecutionStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Skipped = 'skipped',
}

export interface PipelineStep {
  id: string
  name: string
  description?: string
  dependencies?: string[]
  resource?: string
  tags?: string[]
  status?: ExecutionStatus
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface PipelineGraph {
  id: string
  name?: string
  steps: PipelineStep[]
  edges: PipelineEdge[]
}
