import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ParsedEvent } from '@aspire-pipeline-viewer/core'

const electronAPI = {
  selectApphostDirectory: () => ipcRenderer.invoke('select-apphost-directory'),
  getApphostDiagnostics: (directory: string) => ipcRenderer.invoke('get-apphost-diagnostics', directory),
  runAspireDo: (directory: string, step: string) => ipcRenderer.invoke('run-aspire-do', directory, step),
  onAspireOutput: (cb: (data: string) => void) => {
    const handler = (_e: IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on('aspire-output', handler)
    return () => ipcRenderer.removeListener('aspire-output', handler)
  },
  onAspireError: (cb: (data: string) => void) => {
    const handler = (_e: IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on('aspire-error', handler)
    return () => ipcRenderer.removeListener('aspire-error', handler)
  },
  // Run management methods (Phase 4)
  runStep: (stepName: string, graph?: import('@aspire-pipeline-viewer/core').PipelineGraph) =>
    ipcRenderer.invoke('run-step', stepName, graph),
  killRun: (runId: string) => ipcRenderer.invoke('kill-run', runId),
  renameRun: (runId: string, newName: string) => ipcRenderer.invoke('rename-run', runId, newName),
  getRunDetails: (runId: string) => ipcRenderer.invoke('get-run-details', runId),
  onRunOutput: (cb: (event: { runId: string; event: ParsedEvent }) => void) => {
    const handler = (_e: IpcRendererEvent, data: { runId: string; event: ParsedEvent }) => cb(data)
    ipcRenderer.on('run-output', handler)
    return () => ipcRenderer.removeListener('run-output', handler)
  },
  onRunStatusChange: (cb: (event: { runId: string; status: string; nodeStatuses?: Record<string, string> }) => void) => {
    const handler = (_e: IpcRendererEvent, data: { runId: string; status: string; nodeStatuses?: Record<string, string> }) => cb(data)
    ipcRenderer.on('run-status-change', handler)
    return () => ipcRenderer.removeListener('run-status-change', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
