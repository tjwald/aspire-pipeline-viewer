import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  selectApphostDirectory: () => ipcRenderer.invoke('select-apphost-directory'),
  getApphostDiagnostics: (directory: string) => ipcRenderer.invoke('get-apphost-diagnostics', directory),
  runAspireDo: (directory: string, step: string) => ipcRenderer.invoke('run-aspire-do', directory, step),
  onAspireOutput: (cb: (data: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on('aspire-output', handler)
    return () => ipcRenderer.removeListener('aspire-output', handler)
  },
  onAspireError: (cb: (data: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on('aspire-error', handler)
    return () => ipcRenderer.removeListener('aspire-error', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
