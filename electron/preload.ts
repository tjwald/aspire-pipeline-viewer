import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  selectApphostDirectory: () => ipcRenderer.invoke('select-apphost-directory'),
  runAspireDo: (directory: string, step: string) => ipcRenderer.invoke('run-aspire-do', directory, step),
  onAspireOutput: (cb: (data: string) => void) => ipcRenderer.on('aspire-output', (_e, data) => cb(data)),
  onAspireError: (cb: (data: string) => void) => ipcRenderer.on('aspire-error', (_e, data) => cb(data)),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
