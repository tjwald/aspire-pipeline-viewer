import React, { useState, useCallback } from 'react'
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
  initialTabs?: RunTab[]
  onCloseTab?: (tabId: string) => void
}

export function RunTabContainer({ graph, initialTabs = [], onCloseTab }: RunTabContainerProps) {
  const [tabs, setTabs] = useState<RunTab[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(initialTabs[0]?.id)

  const handleCloseTab = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId)
        // If we're closing the active tab, switch to another one
        if (activeTabId === tabId && newTabs.length > 0) {
          const closedIndex = prev.findIndex((t) => t.id === tabId)
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1)
          setActiveTabId(newTabs[newActiveIndex]?.id)
        } else if (newTabs.length === 0) {
          setActiveTabId(undefined)
        }
        return newTabs
      })
      onCloseTab?.(tabId)
    },
    [activeTabId, onCloseTab]
  )

  // Internal addTab - will be exposed via ref or callback in Phase 5
  const _addTab = useCallback((runId: string, targetStepId: string, name?: string) => {
    const tabId = `tab-${Date.now()}`
    const newTab: RunTab = {
      id: tabId,
      runId,
      targetStepId,
      name: name || `Run ${targetStepId}`,
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(tabId)
    return tabId
  }, [])
  
  // Keep reference for future use
  void _addTab

  const activeTab = tabs.find((t) => t.id === activeTabId)

  if (tabs.length === 0) {
    return (
      <div className="run-tab-container empty" data-testid="run-tab-container-empty">
        <div className="empty-message">
          <p>No active runs</p>
          <p className="hint">Right-click a step in the graph or use the sidebar to start a run.</p>
        </div>
        <style>{`
          .run-tab-container.empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #1e1e1e;
          }
          .empty-message {
            text-align: center;
            color: #858585;
          }
          .empty-message p {
            margin: 8px 0;
          }
          .empty-message .hint {
            font-size: 13px;
            color: #6a6a6a;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="run-tab-container" data-testid="run-tab-container">
      <div className="run-tab-bar" role="tablist" data-testid="run-tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`run-tab ${tab.id === activeTabId ? 'active' : ''}`}
            role="tab"
            aria-selected={tab.id === activeTabId}
            onClick={() => setActiveTabId(tab.id)}
            data-testid={`run-tab-${tab.id}`}
          >
            <span className="tab-name">{tab.name}</span>
            <button
              className="tab-close"
              onClick={(e) => handleCloseTab(tab.id, e)}
              aria-label={`Close ${tab.name}`}
              data-testid={`close-tab-${tab.id}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="run-tab-content" data-testid="run-tab-content">
        {activeTab && (
          <RunView
            key={activeTab.runId}
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
