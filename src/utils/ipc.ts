// IPC utility types and helpers for renderer
export interface RunResult {
  code: number | null
  output: string
}

export const selectApphostDirectory = async (): Promise<string | null> => {
  // @ts-ignore
  return window.electronAPI?.selectApphostDirectory?.()
}

export const runAspireDo = async (directory: string, step: string): Promise<RunResult> => {
  // @ts-ignore
  return window.electronAPI?.runAspireDo?.(directory, step)
}
