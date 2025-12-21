import React, { useEffect, useRef } from 'react'

interface Props {
  isVisible: boolean
  onClose: () => void
}

export default function ExecutionPanel({ isVisible, onClose }: Props) {
  const [output, setOutput] = React.useState<string>('')
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible) return

    // Set up IPC listeners for output and errors
    const removeOutputListener = window.electronAPI?.onAspireOutput?.((data: string) => {
      setOutput((prev) => prev + data)
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    })

    const removeErrorListener = window.electronAPI?.onAspireError?.((data: string) => {
      setOutput((prev) => prev + `[ERROR] ${data}`)
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    })

    return () => {
      if (typeof removeOutputListener === 'function') removeOutputListener()
      if (typeof removeErrorListener === 'function') removeErrorListener()
    }
  }, [isVisible])

  const handleClear = () => {
    setOutput('')
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-lg shadow-lg max-h-48 flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700 rounded-t-lg">
        <h3 className="text-sm font-semibold text-gray-100">Execution Output</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 bg-gray-900 font-mono text-xs text-gray-300 whitespace-pre-wrap break-words"
      >
        {output || <span className="text-gray-600">Waiting for output...</span>}
      </div>
    </div>
  )
}
