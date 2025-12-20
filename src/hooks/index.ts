/**
 * Custom hooks for common patterns and state management
 */

import { useState, useCallback } from 'react'
import type { ToastType } from '../components/Toast'

interface ToastState {
  id: string
  message: string
  type: ToastType
  duration?: number
}

/**
 * Hook for managing toast notifications
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    setToast({
      id: Date.now().toString(),
      message,
      type,
      duration,
    })
  }, [])

  const closeToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, closeToast }
}

/**
 * Hook for pipeline data loading with error handling
 */
export function usePipelineData(directory: string | null) {
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const loadPipeline = useCallback(async () => {
    if (!directory) return

    setLoading(true)
    try {
      // @ts-ignore
      const result = await window.electronAPI?.getApphostDiagnostics?.(directory)
      if (result?.output) {
        const { parseDiagnostics } = await import('@aspire/core')
        const pipelineGraph = parseDiagnostics(result.output)
        setGraph(pipelineGraph)
        showToast(`Loaded pipeline with ${pipelineGraph.steps.length} steps`, 'success', 3000)
        return pipelineGraph
      }
      showToast('Failed to load diagnostics - no output received', 'error')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load diagnostics:', err)
      showToast(`Failed to load diagnostics: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [directory, showToast])

  return { graph, loading, loadPipeline }
}

/**
 * Hook for managing step execution
 */
export function useStepExecution(directory: string | null) {
  const [executing, setExecuting] = useState(false)
  const [output, setOutput] = useState('')
  const { showToast } = useToast()

  const executeStep = useCallback(
    async (stepId: string) => {
      if (!directory) {
        showToast('Error: No directory selected', 'error')
        return
      }

      setExecuting(true)
      setOutput('')
      try {
        // @ts-ignore
        const result = await window.electronAPI?.runAspireDo?.(directory, stepId)
        if (result?.code === 0) {
          showToast('Step executed successfully', 'success', 3000)
        } else {
          showToast('Step execution completed with warnings', 'warning')
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Failed to execute step:', err)
        showToast(`Failed to execute step: ${errorMsg}`, 'error')
      } finally {
        setExecuting(false)
      }
    },
    [directory, showToast]
  )

  return { executing, output, setOutput, executeStep }
}
