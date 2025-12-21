import React, { useState } from 'react'

interface AppHostSelectorProps {
  onDirectorySelected: (dir: string) => void
}

export default function AppHostSelector({ onDirectorySelected }: AppHostSelectorProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // call preload IPC
      // @ts-expect-error
      const dir = await window.electronAPI.selectApphostDirectory()
      if (dir) onDirectorySelected(dir)
    } catch (err) {
      console.error(err)
      alert('Failed to select directory')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="max-w-md w-full p-8">
        <h1 className="text-2xl font-bold mb-4">Aspire Pipeline Visualizer</h1>
        <p className="text-sm mb-6 text-gray-600">Select the AppHost directory to load pipeline diagnostics</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleClick} disabled={loading}>
          {loading ? 'Selecting...' : 'Select AppHost Directory'}
        </button>
      </div>
    </div>
  )
}
