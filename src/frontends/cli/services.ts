/**
 * CLI adapter: implements services using Node.js fs and child_process
 */
import fs from 'fs'
import { spawn } from 'child_process'
import type { DiagnosticsProvider, CommandRunner, Logger } from '@aspire/core'
import { ConsoleLogger } from '@aspire/core'

export class NodeDiagnosticsProvider implements DiagnosticsProvider {
  private diagnosticsPath: string

  constructor(diagnosticsPath: string) {
    this.diagnosticsPath = diagnosticsPath
  }

  async getDiagnostics(_directory: string): Promise<string> {
    if (!fs.existsSync(this.diagnosticsPath)) {
      throw new Error(`Diagnostics file not found: ${this.diagnosticsPath}`)
    }
    return fs.readFileSync(this.diagnosticsPath, 'utf-8')
  }
}

export class NodeCommandRunner implements CommandRunner {
  private cwd: string

  constructor(cwd: string) {
    this.cwd = cwd
  }

  async run(directory: string, command: string, args: string[]): Promise<{ code: number; output: string }> {
    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const cmdArgs = process.platform === 'win32' ? ['/c', command, ...args] : ['-lc', `${command} ${args.join(' ')}`]

      const child = spawn(cmd, cmdArgs, { cwd: directory, stdio: 'pipe' })
      let output = ''

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        resolve({ code: code || 0, output })
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}

/**
 * Create CLI service container with file-based diagnostics
 */
export function createCLIServiceContainer(diagnosticsPath: string): {
  diagnosticsProvider: DiagnosticsProvider
  commandRunner: CommandRunner
  logger: Logger
} {
  return {
    diagnosticsProvider: new NodeDiagnosticsProvider(diagnosticsPath),
    commandRunner: new NodeCommandRunner(process.cwd()),
    logger: new ConsoleLogger(),
  }
}
