/**
 * Electron adapter: implements services using IPC to main process
 */
import type { DiagnosticsProvider, CommandRunner, DirectoryChooser, ServiceContainer } from '@/core'
import { ConsoleLogger } from '@/core'

export class ElectronDiagnosticsProvider implements DiagnosticsProvider {
  async getDiagnostics(directory: string): Promise<string> {
    // @ts-ignore
    const result = await window.electronAPI?.getApphostDiagnostics?.(directory)
    return result?.output || ''
  }
}

export class ElectronCommandRunner implements CommandRunner {
  async run(directory: string, command: string, args: string[]): Promise<{ code: number; output: string }> {
    if (command === 'aspire' && args[0] === 'do') {
      // Use the specialized runAspireDo handler
      const step = args[1]
      // @ts-ignore
      const result = await window.electronAPI?.runAspireDo?.(directory, step)
      return { code: result?.code || 1, output: result?.output || '' }
    }
    // Fallback for other commands
    return { code: 1, output: 'Command not supported in Electron' }
  }
}

export class ElectronDirectoryChooser implements DirectoryChooser {
  async selectDirectory(_title: string): Promise<string | null> {
    // @ts-ignore
    return window.electronAPI?.selectApphostDirectory?.()
  }
}

/**
 * Create Electron service container
 */
export function createElectronServiceContainer(): ServiceContainer {
  return {
    diagnosticsProvider: new ElectronDiagnosticsProvider(),
    commandRunner: new ElectronCommandRunner(),
    directoryChooser: new ElectronDirectoryChooser(),
    logger: new ConsoleLogger(),
  }
}
