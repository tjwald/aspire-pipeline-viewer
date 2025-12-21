import React, { useEffect } from 'react'
import { TOAST_STYLES } from '../../shared/theme'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface Props {
  toast: ToastData | null
  onClose: () => void
}

export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const styles = TOAST_STYLES[toast.type]

  return (
    <div className={`fixed bottom-48 left-4 right-4 max-w-sm ${styles.bg} ${styles.text} px-4 py-3 rounded-lg shadow-lg flex items-start gap-3`}>
      <span className="flex-shrink-0 font-bold text-lg">{styles.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button onClick={onClose} className="flex-shrink-0 ml-2 text-lg font-bold opacity-50 hover:opacity-100">
        ✕
      </button>
    </div>
  )
}
