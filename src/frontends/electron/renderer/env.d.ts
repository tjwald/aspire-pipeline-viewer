/// <reference types="vite/client" />

interface ElectronAPI {
  selectApphostDirectory: () => Promise<string | null>
  getApphostDiagnostics: (directory: string) => Promise<{ code: number; output: string }>
  runAspireDo: (directory: string, step: string) => Promise<{ code: number; output: string }>
  onAspireOutput: (cb: (data: string) => void) => () => void
  onAspireError: (cb: (data: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
