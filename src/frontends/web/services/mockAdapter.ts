/**
 * Mock/stub services for web frontend when running in browser context
 */
import type { DiagnosticsProvider, CommandRunner, DirectoryChooser, ServiceContainer } from '@/core'
import { ConsoleLogger } from '@/core'

export class MockDiagnosticsProvider implements DiagnosticsProvider {
  async getDiagnostics(_directory: string): Promise<string> {
    console.warn('MockDiagnosticsProvider: getDiagnostics called but not implemented')
    return ''
  }
}

export class MockCommandRunner implements CommandRunner {
  async run(_directory: string, _command: string, _args: string[]): Promise<{ code: number; output: string }> {
    console.warn('MockCommandRunner: run called but not implemented')
    return { code: 1, output: '' }
  }
}

export class MockDirectoryChooser implements DirectoryChooser {
  async selectDirectory(_title: string): Promise<string | null> {
    console.warn('MockDirectoryChooser: selectDirectory called but not implemented')
    return null
  }
}

/**
 * Create mock service container for web frontend
 */
export function createMockServiceContainer(): ServiceContainer {
  return {
    diagnosticsProvider: new MockDiagnosticsProvider(),
    commandRunner: new MockCommandRunner(),
    directoryChooser: new MockDirectoryChooser(),
    logger: new ConsoleLogger(),
  }
}
