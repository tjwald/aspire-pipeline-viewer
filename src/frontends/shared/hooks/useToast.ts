/**
 * Shared toast state hook for UI surfaces.
 */
import { useCallback, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastState {
  id: string
  message: string
  type: ToastType
  duration?: number
}

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
