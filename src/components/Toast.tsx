import React, { useEffect } from 'react'

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

const getToastStyles = (type: ToastType): { bg: string; text: string; icon: string } => {
  switch (type) {
    case 'success':
      return { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' }
    case 'error':
      return { bg: 'bg-red-100', text: 'text-red-800', icon: '✕' }
    case 'warning':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠' }
    case 'info':
    default:
      return { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'ℹ' }
  }
}

export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const styles = getToastStyles(toast.type)

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
