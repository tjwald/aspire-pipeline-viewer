import { createContext, useContext, type ReactNode } from 'react'
import type { PipelineViewerCapabilities } from '@aspire-pipeline-viewer/core'

const PipelineViewerCapabilitiesContext = createContext<PipelineViewerCapabilities | null>(null)

export interface PipelineViewerCapabilitiesProviderProps {
  capabilities: PipelineViewerCapabilities
  children: ReactNode
}

export function PipelineViewerCapabilitiesProvider({
  capabilities,
  children,
}: PipelineViewerCapabilitiesProviderProps) {
  return (
    <PipelineViewerCapabilitiesContext.Provider value={capabilities}>
      {children}
    </PipelineViewerCapabilitiesContext.Provider>
  )
}

export function usePipelineViewerCapabilities(): PipelineViewerCapabilities {
  const capabilities = useContext(PipelineViewerCapabilitiesContext)
  if (!capabilities) {
    throw new Error('PipelineViewerCapabilitiesProvider is required')
  }
  return capabilities
}
