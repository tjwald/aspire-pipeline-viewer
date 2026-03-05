import React, { useState, useCallback, useEffect } from 'react'
import { RunView } from './RunView'
import type { PipelineGraph } from '@aspire-pipeline-viewer/core'

export interface RunTab {
  id: string
  runId: string
  targetStepId: string
  name: string
}

export interface RunTabContainerProps {
  graph: PipelineGraph
  tabs: RunTab[]
  onCloseTab?: (tabId: string) => void
}

export function RunTabContainer({ graph, tabs, onCloseTab, onOpenRun }: RunTabContainerProps & { onOpenRun?: (runId: string, name: string, targetStepId: string) => void }) {
  const [activeTabId, setActiveTabId] = useState<string | undefined>(tabs[0]?.id)
  const [runsDir, setRunsDir] = useState<string>('')
  const [history, setHistory] = useState<Array<{runId: string, name?: string, startedAt: number, targetStepId?: string}>>([])
  
  // Fetch history and runs dir on mount or when tabs empty
  useEffect(() => {
    if (window.electronAPI?.getRunsDirectory) {
      window.electronAPI.getRunsDirectory().then(setRunsDir).catch(console.error)
    }
    if (window.electronAPI?.getRunHistory) {
      window.electronAPI.getRunHistory().then(setHistory).catch(console.error)
    }
  }, [tabs.length])

  // When tabs change, ensure activeTabId is valid and auto-switch to new tabs
  const prevTabsRef = React.useRef(tabs)
  useEffect(() => {
    const prevTabs = prevTabsRef.current
    if (tabs.length > prevTabs.length) {
      // Find the new tab that was added
      const newTab = tabs.find(t => !prevTabs.find(pt => pt.id === t.id))
      if (newTab) {
        setActiveTabId(newTab.id)
      }
    } else if (tabs.length > 0 && !tabs.find(t => t.id === activeTabId)) {
      // Active tab no longer exists, switch to the last tab
      setActiveTabId(tabs[tabs.length - 1].id)
    }
    prevTabsRef.current = tabs
  }, [tabs, activeTabId])

  const handleCloseTab = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      
      // If we're closing the active tab, switch to another one
      if (activeTabId === tabId && tabs.length > 1) {
        const closedIndex = tabs.findIndex((t) => t.id === tabId)
        const newTabs = tabs.filter((t) => t.id !== tabId)
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1)
        setActiveTabId(newTabs[newActiveIndex]?.id)
      } else if (tabs.length === 1) {
        setActiveTabId(undefined)
      }
      
      onCloseTab?.(tabId)
    },
    [activeTabId, tabs, onCloseTab]
  )

  const activeTab = tabs.find((t) => t.id === activeTabId)

  if (tabs.length === 0) {
    return (
      <div className="run-tab-container empty" data-testid="run-tab-container-empty">
        <div className="empty-message-container">
          <div className="empty-message">
            <p>No active runs</p>
            <p className="hint">Right-click a step in the graph or use the sidebar to start a run.</p>
            {runsDir && (
              <p className="hint" style={{ marginTop: '20px', fontSize: '11px', opacity: 0.6 }}>
                Runs are automatically saved to: <br/>
                <code>
                  {(() => {
                    // Quick heuristic to format the path nicely
                    const lowerPath = runsDir.toLowerCase()
                    if (lowerPath.includes('\\appdata\\roaming\\')) {
                      return runsDir.replace(/^C:\\Users\\[^\\]+\\AppData\\Roaming\\/i, '%APPDATA%\\')
                    } else if (lowerPath.includes('\\appdata\\local\\')) {
                      return runsDir.replace(/^C:\\Users\\[^\\]+\\AppData\\Local\\/i, '%LOCALAPPDATA%\\')
                    } else {
                      // Fallback POSIX tilde
                      const home = '/home/'
                      if (runsDir.startsWith(home)) {
                        const parts = runsDir.split('/')
                        if (parts.length >= 3) {
                          return `~/${parts.slice(3).join('/')}`
                        }
                      }
                    }
                    return runsDir
                  })()}
                </code>
              </p>
            )}
            
            {history.length > 0 && (
              <div className="recent-runs">
                <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#e0e0e0' }}>Recent Runs from Disk</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left', width: '100%', maxWidth: '400px' }}>
                  {history.slice(0, 10).map(run => (
                    <li
                      key={run.runId}
                      onClick={() => onOpenRun?.(run.runId, run.name || 'Unknown Run', run.targetStepId || 'History')}
                      style={{ padding: '8px 12px', background: '#2d2d2d', marginBottom: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontWeight: 500 }}>{run.name || run.runId}</span>
                      <span style={{ fontSize: '12px', color: '#858585' }}>{new Date(run.startedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <style>{`
          .run-tab-container.empty {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          .empty-message-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1e1e1e;
            min-height: 0;
          }
          .empty-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #858585;
          }
          .empty-message p { margin: 8px 0 }
          .empty-message .hint { font-size: 13px; color: #6a6a6a }
          .recent-runs li:hover { background: #3c3c3c !important; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="run-tab-container" data-testid="run-tab-container">
      <div className="run-tab-bar" role="tablist" data-testid="run-tab-bar">
        {tabs.map((tab) => (
          <RunTabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={() => setActiveTabId(tab.id)}
            onClose={(e) => handleCloseTab(tab.id, e)}
          />
        ))}
      </div>
      <div className="run-tab-content" data-testid="run-tab-content">
        {activeTab && (
          <RunView
            key={activeTab.id}
            runId={activeTab.runId}
            graph={graph}
            targetStepId={activeTab.targetStepId}
            initialName={activeTab.name}
          />
        )}
      </div>
      <style>{`
        .run-tab-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #1e1e1e;
        }
        .run-tab-bar {
          display: flex;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          overflow-x: auto;
          flex-shrink: 0;
        }
        .run-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #2d2d2d;
          border-right: 1px solid #3c3c3c;
          cursor: pointer;
          color: #858585;
          font-size: 13px;
          min-width: 120px;
          max-width: 200px;
        }
        .run-tab:hover {
          background: #323232;
        }
        .run-tab.active {
          background: #1e1e1e;
          color: #e0e0e0;
          border-bottom: 2px solid #0e639c;
        }
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tab-close {
          width: 18px;
          height: 18px;
          border: none;
          background: transparent;
          color: #858585;
          cursor: pointer;
          border-radius: 3px;
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tab-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e0e0e0;
        }
        .run-tab-content {
          flex: 1;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

// Export the addTab callback type for external use
export interface RunTabContainerRef {
  addTab: (runId: string, targetStepId: string, name?: string) => string
}

// Hook to manage run tabs from outside the component
export function useRunTabs() {
  const [tabs, setTabs] = useState<RunTab[]>([])

  const addTab = useCallback((runId: string, targetStepId: string, name?: string): string => {
    const tabId = `tab-${Date.now()}`
    const newTab: RunTab = {
      id: tabId,
      runId,
      targetStepId,
      name: name || `Run ${targetStepId}`,
    }
    setTabs((prev) => [...prev, newTab])
    return tabId
  }, [])

  const removeTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== tabId))
  }, [])

  return { tabs, addTab, removeTab }
}

// Subcomponent for handling complex tab state (status updates, timer, inline rename)
function RunTabItem({
  tab,
  isActive,
  onClick,
  onClose,
}: {
  tab: RunTab
  isActive: boolean
  onClick: () => void
  onClose: (e: React.MouseEvent) => void
}) {
  const [status, setStatus] = useState<string>('running')
  const [elapsed, setElapsed] = useState<number>(0)
  const [name, setName] = useState<string>(tab.name)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editName, setEditName] = useState(name)

  // Listen for synthetic events from RunView to mirror state without heavy React Context overhead
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) {
        if (detail.status) setStatus(detail.status)
        if (detail.elapsed !== undefined) setElapsed(detail.elapsed)
        // If RunView synced a history name load, respect it here (runState.name in RunView)
        // If user initiates inline rename from tab, we override this in handleSaveRename
        if (detail.name && !isRenaming) setName(detail.name)
      }
    }
    window.addEventListener(`run-tab-update-${tab.runId}`, handleUpdate)
    return () => window.removeEventListener(`run-tab-update-${tab.runId}`, handleUpdate)
  }, [tab.runId, isRenaming])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (window.electronAPI?.showTabContextMenu && !isRenaming) {
      window.electronAPI.showTabContextMenu().then(action => {
        if (action === 'rename') {
          setIsRenaming(true)
          setEditName(name)
        }
      })
    } else {
      // Fallback for non-electron or if context menu API missing
      setIsRenaming(true)
      setEditName(name)
    }
  }

  const handleSaveRename = async () => {
    if (window.electronAPI?.renameRun && editName.trim()) {
      await window.electronAPI.renameRun(tab.runId, editName)
      setName(editName) // optimistically update local UI
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setEditName(name)
    }
  }

  // Format status badge inline
  let statusIcon = '● '
  let statusColor = '#f59e0b'
  if (status === 'success') {
    statusIcon = '✔ '
    statusColor = '#22c55e'
  } else if (status === 'failed') {
    statusIcon = '✖ '
    statusColor = '#ef4444'
  }

  return (
    <div
      className={`run-tab ${isActive ? 'active' : ''}`}
      role="tab"
      aria-selected={isActive}
      onClick={!isRenaming ? onClick : undefined}
      onContextMenu={handleContextMenu}
      data-testid={`run-tab-${tab.id}`}
      title="Right click to rename"
    >
      <span style={{ color: statusColor, marginRight: '4px', fontSize: '10px' }}>{statusIcon}</span>
      {isRenaming ? (
        <input
          autoFocus
          className="tab-rename-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()} // Prevent activating tab when clicking input
        />
      ) : (
        <>
          <span className="tab-name">{name}</span>
          {status === 'running' && elapsed > 0 && <span className="tab-timer">({elapsed}s)</span>}
        </>
      )}
      <button
        className="tab-close"
        onClick={onClose}
        aria-label={`Close ${name}`}
        data-testid={`close-tab-${tab.id}`}
      >
        ×
      </button>
      <style>{`
        .tab-rename-input {
          background: #3c3c3c;
          border: 1px solid #0e639c;
          color: #e0e0e0;
          font-size: 13px;
          padding: 2px 4px;
          width: 80px;
          flex: 1;
        }
        .tab-timer {
          font-size: 11px;
          color: #858585;
          margin-left: 4px;
        }
      `}</style>
    </div>
  )
}
